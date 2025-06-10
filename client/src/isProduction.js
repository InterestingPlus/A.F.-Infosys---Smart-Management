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
    return url;
  } else {
    return "http://localhost:4000";
  }
}

export default apiPath;
