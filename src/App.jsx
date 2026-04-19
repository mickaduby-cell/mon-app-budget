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

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f4f6f8",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
          Mon Budget
        </h1>

        <h2 style={{ marginBottom: "15px" }}>Tableau de bord</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "15px",
          }}
        >
          <div style={{ backgroundColor: "#eef6ff", padding: "14px", borderRadius: "10px" }}>
            <strong>Solde affiché</strong>
            <div style={{ marginTop: "6px", color: balance >= 0 ? "green" : "red" }}>
              {balance} €
            </div>
          </div>

          <div style={{ backgroundColor: "#e8f9ee", padding: "14px", borderRadius: "10px" }}>
            <strong>Revenus affichés</strong>
            <div style={{ marginTop: "6px" }}>{totalIncome} €</div>
          </div>

          <div style={{ backgroundColor: "#fdecec", padding: "14px", borderRadius: "10px" }}>
            <strong>Dépenses affichées</strong>
            <div style={{ marginTop: "6px" }}>{totalExpense} €</div>
          </div>

          <div style={{ backgroundColor: "#f9fafb", padding: "14px", borderRadius: "10px" }}>
            <strong>Catégorie la plus élevée</strong>
            <div style={{ marginTop: "6px" }}>
              {biggestCategoryName === "Aucune"
                ? "Aucune"
                : `${biggestCategoryName} (${biggestCategoryAmount} €)`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "25px",
          }}
        >
          <div style={{ backgroundColor: "#fff7ed", padding: "14px", borderRadius: "10px" }}>
            <strong>Budget mensuel</strong>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div
            style={{
              backgroundColor: remainingToSpend >= 0 ? "#ecfdf5" : "#fef2f2",
              padding: "14px",
              borderRadius: "10px",
            }}
          >
            <strong>Restant à dépenser ce mois-ci</strong>
            <div
              style={{
                marginTop: "10px",
                fontSize: "20px",
                fontWeight: "bold",
                color: remainingToSpend >= 0 ? "green" : "red",
              }}
            >
              {remainingToSpend} €
            </div>
          </div>
        </div>

        <h2 style={{ marginBottom: "15px" }}>
          {editId ? "Modifier une transaction" : "Ajouter une transaction"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
          <input
            type="text"
            placeholder="Libellé"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          >
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          >
            <option value="Courses">Courses</option>
            <option value="Logement">Logement</option>
            <option value="Essence">Essence</option>
            <option value="Loisirs">Loisirs</option>
            <option value="Salaire">Salaire</option>
            <option value="Crédit">Crédit</option>
            <option value="Autre">Autre</option>
          </select>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={addOrUpdateTransaction}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: editId ? "#d97706" : "#2563eb",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {editId ? "Mettre à jour la transaction" : "Ajouter la transaction"}
            </button>

            {editId && (
              <button
                onClick={resetForm}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#6b7280",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Annuler la modification
              </button>
            )}
          </div>
        </div>

        <h2 style={{ marginBottom: "15px" }}>Filtres</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
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
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}
          />

          <button
            onClick={() => {
              setFilterCategory("Toutes");
              setFilterMonth("");
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#6b7280",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Enlever les filtres
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px" }}>
          <button
            onClick={clearAllTransactions}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#111827",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Effacer toutes les transactions
          </button>

          <button
            onClick={exportToCSV}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#059669",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Exporter en CSV
          </button>

          <button
            onClick={handleImportClick}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#7c3aed",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
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

        <h2 style={{ marginBottom: "15px" }}>Liste des transactions</h2>

        <ul style={{ listStyle: "none", padding: 0, marginBottom: "25px" }}>
          {filteredTransactions.length === 0 ? (
            <li style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
              Aucune transaction pour ce filtre
            </li>
          ) : (
            filteredTransactions.map((transaction) => (
              <li
                key={transaction.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px",
                  marginBottom: "10px",
                  backgroundColor:
                    transaction.type === "income" ? "#e8f9ee" : "#fdecec",
                  borderRadius: "8px",
                }}
              >
                <span>
                  {transaction.type === "income" ? "+ " : "- "}
                  {transaction.amount} € — {transaction.label} ({transaction.category}) —{" "}
                  {formatDate(transaction.date)}
                </span>

                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => editTransaction(transaction)}
                    style={{
                      border: "none",
                      backgroundColor: "#f59e0b",
                      color: "white",
                      padding: "8px 10px",
                      borderRadius: "6px",
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
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>

        <h2 style={{ marginBottom: "15px" }}>Résumé des dépenses</h2>

        <ul style={{ listStyle: "none", padding: 0, marginBottom: "25px" }}>
          {Object.entries(expenseSummary).length === 0 ? (
            <li style={{ backgroundColor: "#f9fafb", padding: "10px", borderRadius: "8px" }}>
              Aucune dépense pour ce filtre
            </li>
          ) : (
            Object.entries(expenseSummary).map(([cat, total]) => (
              <li
                key={cat}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>{cat}</strong> : {total} €
              </li>
            ))
          )}
        </ul>

        <h2 style={{ marginBottom: "15px" }}>Graphique des dépenses</h2>

        {Object.entries(expenseSummary).length === 0 ? (
          <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
            Pas de graphique à afficher
          </div>
        ) : (
          <div style={{ marginTop: "15px" }}>
            {Object.entries(expenseSummary).map(([cat, total]) => (
              <div key={cat} style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                    fontSize: "14px",
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
                      backgroundColor: "#2563eb",
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
  );
}

export default App;
