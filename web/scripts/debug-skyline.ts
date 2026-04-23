async function debugSkyline() {
  const host = "skytelvo1.ddns.net";
  const paths = ["/goip/get_status", "/sms/get_status", "/status.php", "/info.html", "/goip/index.php"];
  
  for (const path of paths) {
    try {
      console.log(`Checking ${path}...`);
      const res = await fetch(`http://${host}${path}`);
      console.log(`Status: ${res.status}`);
      const text = await res.text();
      console.log(`Body (first 100 chars): ${text.substring(0, 100)}`);
    } catch (e: any) {
      console.log(`Error on ${path}: ${e.message}`);
    }
  }
}

debugSkyline();
