import { useEffect, useRef, useState } from "react";

function App() {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);
  const fileInputRef = useRef(null);

  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Courses");
  const [date, setDate] = useState(today);
  const [filterCategory, setFilterCategory] = useState("Toutes");
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [editId, setEditId] = useState(null);
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const savedBudget = localStorage.getItem("monthlyBudget");
    return savedBudget ? Number(savedBudget) : 2000;
  });

  const [transactions, setTransactions] = useState(() => {
    const savedTransactions = localStorage.getItem("transactions");
    return savedTransactions ? JSON.parse(savedTransactions) : [];
  });

  useEffect(() => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("monthlyBudget", String(monthlyBudget));
  }, [monthlyBudget]);

  const resetForm = () => {
    setAmount("");
    setLabel("");
    setType("expense");
    setCategory("Courses");
    setDate(today);
    setEditId(null);
  };

  const addOrUpdateTransaction = () => {
    if (!amount || !label || !date) return;

    if (editId) {
      const updatedTransactions = transactions.map((transaction) =>
        transaction.id === editId
          ? {
              ...transaction,
              amount: Number(amount),
              type,
              label,
              category,
              date,
            }
          : transaction
      );

      setTransactions(updatedTransactions);
      resetForm();
    } else {
      const newTransaction = {
        id: Date.now() + Math.random(),
        amount: Number(amount),
        type,
        label,
        category,
        date,
      };

      setTransactions([...transactions, newTransaction]);
      resetForm();
    }
  };

  const deleteTransaction = (idToDelete) => {
    const updatedTransactions = transactions.filter(
      (transaction) => transaction.id !== idToDelete
    );
    setTransactions(updatedTransactions);
  };

  const clearAllTransactions = () => {
    const confirmed = window.confirm(
      "Tu veux vraiment supprimer toutes les transactions ?"
    );

    if (confirmed) {
      setTransactions([]);
      resetForm();
      setFilterCategory("Toutes");
      setFilterMonth(currentMonth);
    }
  };

  const editTransaction = (transaction) => {
    setAmount(transaction.amount);
    setType(transaction.type);
    setLabel(transaction.label);
    setCategory(transaction.category);
    setDate(transaction.date || today);
    setEditId(transaction.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchCategory =
      filterCategory === "Toutes" || transaction.category === filterCategory;

    const matchMonth =
      !filterMonth ||
      (transaction.date && transaction.date.slice(0, 7) === filterMonth);

    return matchCategory && matchMonth;
  });

  const totalIncome = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const totalExpense = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const balance = totalIncome - totalExpense;
  const remainingToSpend = monthlyBudget - totalExpense;

  const expenseSummary = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((summary, transaction) => {
      const existing = summary[transaction.category] || 0;
      summary[transaction.category] = existing + Number(transaction.amount);
      return summary;
    }, {});

  const maxExpense = Math.max(...Object.values(expenseSummary), 0);

  const biggestCategoryEntry = Object.entries(expenseSummary).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const biggestCategoryName = biggestCategoryEntry ? biggestCategoryEntry[0] : "Aucune";
  const biggestCategoryAmount = biggestCategoryEntry ? biggestCategoryEntry[1] : 0;

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("Aucune transaction à exporter");
      return;
    }

    const headers = ["Date", "Libellé", "Montant", "Type", "Catégorie"];

    const rows = filteredTransactions.map((t) => [
      t.date ? t.date.split("-").reverse().join("-") : "",
      `"${(t.label || "").replace(/"/g, '""')}"`,
      t.amount,
      t.type === "income" ? "Revenu" : "Dépense",
      `"${(t.category || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "budget.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

      if (lines.length < 2) {
        alert("Le fichier est vide ou invalide");
        event.target.value = "";
        return;
      }

      const dataLines = lines.slice(1);

      const importedTransactions = dataLines
        .map((line) => {
          const parts = line.split(";");

          if (parts.length < 5) return null;

          const rawDate = parts[0].trim();
          const rawLabel = parts[1]
            .trim()
            .replace(/^"|"$/g, "")
            .replace(/""/g, '"');
          const rawAmount = parts[2].trim().replace(",", ".");
          const rawType = parts[3].trim();
          const rawCategory = parts[4]
            .trim()
            .replace(/^"|"$/g, "")
            .replace(/""/g, '"');

          let formattedDate = today;

          if (rawDate.includes("-")) {
            const dateParts = rawDate.split("-");
            if (dateParts[0].length === 2) {
              formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            } else {
              formattedDate = rawDate;
            }
          }

          return {
            id: Date.now() + Math.random(),
            date: formattedDate,
            label: rawLabel,
            amount: Number(rawAmount),
            type: rawType === "Revenu" ? "income" : "expense",
            category: rawCategory || "Autre",
          };
        })
        .filter(
          (item) =>
            item &&
            item.label &&
            !Number.isNaN(item.amount) &&
            item.type &&
            item.category
        );

      if (importedTransactions.length === 0) {
        alert("Aucune ligne exploitable dans le fichier");
        event.target.value = "";
        return;
      }

      const confirmed = window.confirm(
        "Ajouter ce fichier aux transactions déjà présentes ?"
      );

      if (confirmed) {
        setTransactions([...transactions, ...importedTransactions]);
      }

      event.target.value = "";
    };

    reader.readAsText(file);
  };

  const formatDate = (value) => {
    return value ? value.split("-").reverse().join("-") : "Sans date";
  };

  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "14px",
    color: "#111827",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  };

  const primaryButton = {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37,99,235,0.25)",
  };

  const secondaryButton = {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "none",
    backgroundColor: "#6b7280",
    color: "white",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  };

  const cardStyle = {
    backgroundColor: "white",
    borderRadius: "22px",
    padding: "18px",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(226,232,240,0.9)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eff6ff 0%, #f8fafc 35%, #f1f5f9 100%)",
        padding: "18px",
        fontFamily:
          "Inter, Arial, Helvetica, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            ...cardStyle,
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
            color: "white",
            padding: "24px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              opacity: 0.85,
              marginBottom: "8px",
              letterSpacing: "0.3px",
            }}
          >
            Tableau de bord
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              lineHeight: 1.1,
              fontWeight: "800",
            }}
          >
            Mon Budget
          </h1>

          <div
            style={{
              marginTop: "18px",
              padding: "18px",
              borderRadius: "18px",
              backgroundColor: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Solde affiché</div>
            <div
              style={{
                fontSize: "34px",
                fontWeight: "800",
                marginTop: "6px",
                color: balance >= 0 ? "#dcfce7" : "#fecaca",
              }}
            >
              {balance} €
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            style={{
              ...cardStyle,
              background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#065f46", marginBottom: "6px" }}>
              Revenus affichés
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#047857" }}>
              {totalIncome} €
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#991b1b", marginBottom: "6px" }}>
              Dépenses affichées
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#dc2626" }}>
              {totalExpense} €
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background:
                remainingToSpend >= 0
                  ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
                  : "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#374151", marginBottom: "6px" }}>
              Restant à dépenser
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: remainingToSpend >= 0 ? "#2563eb" : "#ea580c",
              }}
            >
              {remainingToSpend} €
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: "13px", color: "#374151", marginBottom: "6px" }}>
              Catégorie la plus élevée
            </div>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#111827" }}>
              {biggestCategoryName === "Aucune"
                ? "Aucune"
                : biggestCategoryName}
            </div>
            <div style={{ marginTop: "4px", color: "#6b7280", fontSize: "14px" }}>
              {biggestCategoryName === "Aucune"
                ? "Aucune dépense"
                : `${biggestCategoryAmount} €`}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Budget mensuel</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
            }}
          >
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
              style={inputStyle}
              placeholder="Budget du mois"
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>
            {editId ? "Modifier une transaction" : "Ajouter une transaction"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
            }}
          >
            <input
              type="text"
              placeholder="Libellé"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={inputStyle}
            >
              <option value="expense">Dépense</option>
              <option value="income">Revenu</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="Courses">Courses</option>
              <option value="Logement">Logement</option>
              <option value="Essence">Essence</option>
              <option value="Loisirs">Loisirs</option>
              <option value="Salaire">Salaire</option>
              <option value="Crédit">Crédit</option>
              <option value="Autre">Autre</option>
            </select>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: editId ? "1fr 1fr" : "1fr",
                gap: "10px",
              }}
            >
              <button onClick={addOrUpdateTransaction} style={primaryButton}>
                {editId ? "Mettre à jour la transaction" : "Ajouter la transaction"}
              </button>

              {editId && (
                <button onClick={resetForm} style={secondaryButton}>
                  Annuler la modification
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Filtres</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px",
            }}
          >
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="Toutes">Toutes les catégories</option>
              <option value="Courses">Courses</option>
              <option value="Logement">Logement</option>
              <option value="Essence">Essence</option>
              <option value="Loisirs">Loisirs</option>
              <option value="Salaire">Salaire</option>
              <option value="Crédit">Crédit</option>
              <option value="Autre">Autre</option>
            </select>

            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={inputStyle}
            />

            <button
              onClick={() => {
                setFilterCategory("Toutes");
                setFilterMonth("");
              }}
              style={secondaryButton}
            >
              Enlever les filtres
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Actions</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "10px",
            }}
          >
            <button
              onClick={clearAllTransactions}
              style={{
                ...secondaryButton,
                backgroundColor: "#111827",
              }}
            >
              Effacer toutes les transactions
            </button>

            <button
              onClick={exportToCSV}
              style={{
                ...secondaryButton,
                backgroundColor: "#059669",
              }}
            >
              Exporter en CSV
            </button>

            <button
              onClick={handleImportClick}
              style={{
                ...secondaryButton,
                backgroundColor: "#7c3aed",
              }}
            >
              Importer un fichier CSV
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={importFromCSV}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Liste des transactions</div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {filteredTransactions.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Aucune transaction pour ce filtre
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    backgroundColor:
                      transaction.type === "income" ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${
                      transaction.type === "income" ? "#bbf7d0" : "#fecaca"
                    }`,
                    borderRadius: "18px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "800",
                          fontSize: "16px",
                          color: "#111827",
                        }}
                      >
                        {transaction.type === "income" ? "+ " : "- "}
                        {transaction.amount} €
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "15px",
                          color: "#374151",
                        }}
                      >
                        {transaction.label}
                      </div>

                      <div
                        style={{
                          marginTop: "8px",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: "white",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {transaction.category}
                        </span>

                        <span
                          style={{
                            backgroundColor: "white",
                            borderRadius: "999px",
                            padding: "6px 10px",
                            fontSize: "12px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minWidth: "96px",
                      }}
                    >
                      <button
                        onClick={() => editTransaction(transaction)}
                        style={{
                          border: "none",
                          backgroundColor: "#f59e0b",
                          color: "white",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        style={{
                          border: "none",
                          backgroundColor: "#dc2626",
                          color: "white",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Résumé des dépenses</div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {Object.entries(expenseSummary).length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                Aucune dépense pour ce filtre
              </div>
            ) : (
              Object.entries(expenseSummary).map(([cat, total]) => (
                <div
                  key={cat}
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "14px",
                    borderRadius: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>{cat}</strong>
                  <span>{total} €</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Graphique des dépenses</div>

          {Object.entries(expenseSummary).length === 0 ? (
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              Pas de graphique à afficher
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {Object.entries(expenseSummary).map(([cat, total]) => (
                <div key={cat}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "6px",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    <span>{cat}</span>
                    <span>{total} €</span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "999px",
                      height: "14px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${maxExpense > 0 ? (total / maxExpense) * 100 : 0}%`,
                        background:
                          "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
                        height: "100%",
                        borderRadius: "999px",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
