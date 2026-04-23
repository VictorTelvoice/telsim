async function fetchLoginJs() {
  const host = "skytelvo1.ddns.net";
  try {
    const res = await fetch(`http://${host}/login_en.html`);
    const text = await res.text();
    // Buscar scripts .js
    const scripts = text.match(/src="([^"]+\.js)"/g);
    console.log("Scripts encontrados en login_en.html:");
    console.log(scripts);
    
    // También intentar index.html o home.html por si acaso
    const resHome = await fetch(`http://${host}/index.html`);
    const textHome = await resHome.text();
    const scriptsHome = textHome.match(/src="([^"]+\.js)"/g);
    console.log("Scripts encontrados en index.html:");
    console.log(scriptsHome);

  } catch (e: any) {
    console.log("Error: " + e.message);
  }
}
fetchLoginJs();
