import React from "react";
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
    const saved = localStorage.getItem("monthlyBudget");
    return saved ? Number(saved) : 2000;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("transactions");
    return saved ? JSON.parse(saved) : [];
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
      setTransactions(
        transactions.map((t) =>
          t.id === editId
            ? { ...t, amount: Number(amount), type, label, category, date }
            : t
        )
      );
      resetForm();
    } else {
      setTransactions([
        ...transactions,
        {
          id: Date.now(),
          amount: Number(amount),
          type,
          label,
          category,
          date,
        },
      ]);
      resetForm();
    }
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const filtered = transactions.filter((t) => {
    const okCat = filterCategory === "Toutes" || t.category === filterCategory;
    const okMonth =
      !filterMonth || t.date.slice(0, 7) === filterMonth;
    return okCat && okMonth;
  });

  const income = filtered
    .filter((t) => t.type === "income")
    .reduce((a, b) => a + b.amount, 0);

  const expense = filtered
    .filter((t) => t.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  const balance = income - expense;
  const remaining = monthlyBudget - expense;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Mon Budget</h1>

      <h2>Tableau de bord</h2>
      <p>Solde : {balance} €</p>
      <p>Dépenses : {expense} €</p>
      <p>Revenus : {income} €</p>
      <p>Restant à dépenser : {remaining} €</p>

      <h2>Ajouter</h2>

      <input
        placeholder="Libellé"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      <input
        type="number"
        placeholder="Montant"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="expense">Dépense</option>
        <option value="income">Revenu</option>
      </select>

      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option>Courses</option>
        <option>Essence</option>
        <option>Loisirs</option>
        <option>Salaire</option>
        <option>Crédit</option>
      </select>

      <button onClick={addOrUpdateTransaction}>
        Ajouter
      </button>

      <h2>Transactions</h2>

      {filtered.map((t) => (
        <div key={t.id}>
          {t.label} - {t.amount} € ({t.category})
          <button onClick={() => deleteTransaction(t.id)}>X</button>
        </div>
      ))}
    </div>
  );
}

export default App;
