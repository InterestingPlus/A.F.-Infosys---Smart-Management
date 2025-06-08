import cron from "cron";
import https from "https";

const job = new cron.CronJob("*/14 * * * *", function () {
  https
    .get("https://a-f-infosys-smart-management.onrender.com", (res) => {
      if (res.statusCode === 200) console.log("GET Request sent Successfully!");
      else console.log("GET Request failed!", res.statusCode);
    })
    .on("error", (e) => console.error("Error while Sending request", e));
});

export default job;
