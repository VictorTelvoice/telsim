async function checkFiles() {
  const host = "skytelvo1.ddns.net";
  const files = [
    "status.php", "goip_status.php", "get_status.php", "status.xml", 
    "get_info.cgi", "sms_status.php", "port_status.php", "sim_status.php",
    "goip/get_status", "goip/sms_status", "sms/get_status", "api/status",
    "cgi-bin/get_status.cgi", "cgi-bin/sms_send.cgi", "xml_status.cgi"
  ];
  
  for (const f of files) {
    try {
      const res = await fetch(`http://${host}/${f}`);
      if (res.status !== 404) {
        console.log(`FOUND POSSIBLE: ${f} (Status: ${res.status})`);
      }
    } catch (e) {}
  }
}
checkFiles();
