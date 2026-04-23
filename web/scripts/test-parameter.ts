async function testParameterPath() {
  const host = "skytelvo1.ddns.net";
  const path = "/get_parameter.html";
  try {
    console.log(`Checking ${path}...`);
    const res = await fetch(`http://${host}${path}`);
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Body (first 1000 chars):`);
    console.log(text.substring(0, 1000));
  } catch (e: any) {
    console.log("Error: " + e.message);
  }
}
testParameterPath();
