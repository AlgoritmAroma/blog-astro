"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="admin-login-shell">
      <div className="admin-login-box">
        <h1 style={{ fontSize: "1.4rem", marginBottom: 24 }}>Вход в админку блога</h1>
        <form action={formAction}>
          <div className="admin-form-field">
            <label htmlFor="username">Логин</label>
            <input id="username" name="username" type="text" required className="admin-input" autoFocus />
          </div>
          <div className="admin-form-field">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" required className="admin-input" />
          </div>
          <button type="submit" className="admin-btn" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Вход…" : "Войти"}
          </button>
          {state.error && <p className="admin-error">{state.error}</p>}
        </form>
      </div>
    </div>
  );
}
