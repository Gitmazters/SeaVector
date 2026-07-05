document.addEventListener("DOMContentLoaded", function () {
  const getPositionBtn = document.getElementById("getPositionBtn");
  const loadWeatherBtn = document.getElementById("loadWeatherBtn");

  getPositionBtn.addEventListener("click", getMyPosition);
  loadWeatherBtn.addEventListener("click", loadSmhiWeather);
});

function getNumberFromInput(id) {
  return parseFloat(
    document.getElementById(id).value.replace(",", ".")
  );
}

function getMyPosition() {
  const status = document.getElementById("positionStatus");

  if (!navigator.geolocation) {
    status.textContent = "GPS stöds inte i denna webbläsare.";
    return;
  }

  status.textContent = "Hämtar GPS-position...";

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      document.getElementById("weatherLat").value = lat.toFixed(6).replace(",", ".");
      document.getElementById("weatherLon").value = lon.toFixed(6).replace(",", ".");

      status.textContent =
        `Position hämtad: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

      loadSmhiWeather();
    },
    function (error) {
      if (error.code === 1) {
        status.textContent = "Du nekade platsåtkomst. Tillåt plats i webbläsaren.";
      } else if (error.code === 2) {
        status.textContent = "Positionen kunde inte fastställas.";
      } else if (error.code === 3) {
        status.textContent = "GPS tog för lång tid.";
      } else {
        status.textContent = "Okänt GPS-fel.";
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

async function loadSmhiWeather(lat, lon) {
  const weatherResult = document.getElementById("weatherResult");

  //Detta är det du behöver... Du behöver ange positionen i frågna till SMHI
  lat = document.getElementById("weatherLat").value;
  lon = document.getElementById("weatherLon").value;

  const url =
    `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${lon}/lat/${lat}/data.json?timeseries=1&parameters=air_temperature,wind_speed,wind_direction,air_pressure`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("SMHI svarade med felkod: " + response.status);
    }

    const data = await response.json();

    if (!data.timeSeries || data.timeSeries.length === 0) {
      weatherResult.textContent = "SMHI skickade ingen prognos för denna position.";
      return;
    }

    const forecast = data.timeSeries[0];

    weatherResult.innerHTML = `
      Prognostid: <b>${new Date(forecast.time).toLocaleTimeString()}</b><br>
      Temperatur: <b>${forecast.data.air_temperature ?? "saknas"} °C</b><br>
      Vind: <b>${forecast.data.wind_speed ?? "saknas"} m/s</b><br>
      Vindriktning: <b>${forecast.data.wind_direction ?? "saknas"}°</b><br>
      Lufttryck: <b>${forecast.data.air_pressure ?? "saknas"} hPa</b>
    `;
  } catch (error) {
    weatherResult.textContent = "Kunde inte hämta väder från SMHI.";
    console.error("SMHI-fel:", error);
  }
}

async function loadWaveHeight(lat, lon) {
  document.getElementById("waveResult").innerHTML = `
    Våghöjd: <b>Inte kopplad ännu</b><br>
    SMHI:s vanliga väder-API ger inte våghöjd direkt.
  `;
}