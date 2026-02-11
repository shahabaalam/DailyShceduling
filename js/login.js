const loginBtn = document.getElementById("google-login");
const loginMessage = document.getElementById("login-message");

async function checkSession() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.authenticated) {
      window.location.replace("/");
    }
  } catch (_error) {
    // Keep landing page visible if backend is unavailable.
  }
}

function showCallbackError() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (!error) return;
  loginMessage.textContent = `Google sign-in failed: ${error}`;
}

loginBtn.addEventListener("click", () => {
  loginMessage.textContent = "";
  window.location.href = "/auth/google/login";
});

showCallbackError();
checkSession();
