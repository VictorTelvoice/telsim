async function debugSkylineRoot() {
  const host = "skytelvo1.ddns.net";
  try {
    console.log(`Checking root / ...`);
    const res = await fetch(`http://${host}/`);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Body (first 500 chars): ${text.substring(0, 500)}`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}
debugSkylineRoot();
