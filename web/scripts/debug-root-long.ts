async function debugSkylineRootLong() {
  const host = "skytelvo1.ddns.net";
  const res = await fetch(`http://${host}/`);
  const text = await res.text();
  console.log(text.substring(0, 2000));
}
debugSkylineRootLong();
