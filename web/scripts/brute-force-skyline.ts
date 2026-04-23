async function bruteForceSkyline() {
  const host = "skytelvo1.ddns.net";
  const paths = [
    "/goip/get_status", "/api/v1/ports", "/sms/status", "/cgi-bin/get_status",
    "/goip/sms_status", "/status", "/api/status", "/get_status", "/goip_status.php",
    "/cgi-bin/xml_status.cgi", "/cgi-bin/get_info.cgi", "/xml_status.php",
    "/api/v1/devices", "/api/v1/slots", "/goip/get_all_sms", "/goip/get_sms_status"
  ];
  
  for (const path of paths) {
    try {
      const res = await fetch(`http://${host}${path}`, { method: 'GET' });
      if (res.status === 200) {
        const text = await res.text();
        if (text.includes("{") || text.includes("<")) {
          console.log(`FOUND! ${path} (Status ${res.status})`);
          console.log(text.substring(0, 100));
        }
      } else {
        // console.log(`Tried ${path}: ${res.status}`);
      }
    } catch (e) {}
  }
}
bruteForceSkyline();
