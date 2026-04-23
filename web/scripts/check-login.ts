async function checkLogin() {
  const host = "skytelvo1.ddns.net";
  const res = await fetch(`http://${host}/login_en.html`);
  console.log(`Login status: ${res.status}`);
}
checkLogin();
