async function apiPath() {
  let isProduction = false;
  let url = "";

  await fetch("/production.json")
    .then((response) => response.json())
    .then((data) => {
      isProduction = data.production;
      url = data.url;
    })
    .catch((error) => {
      alert("Internet Not Connected!");
    });

  if (isProduction) {
    // return "https://hms-backend-tr2u.onrender.com";
    // return "https://hms-backend-production-7d9d.up.railway.app"; Jatin
    //  https://mediconnect-hms-backend-production.up.railway.app; Piyush

    return url;
  } else {
    return "http://localhost:4000";
    // return "http://192.168.129.169:4444";
  }
}

export default apiPath;
