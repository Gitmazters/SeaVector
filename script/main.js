function getNumber(id) {
  const value = parseFloat(document.getElementById(id).value);

  if (isNaN(value) || value <= 0) {
    return null;
  }
  return value;
}

function calculateSpeed() {
  const distance = getNumber("distance");
  const time = getNumber("time");

  if (!distance || !time) {
    showResult("Fyll i distans och tid.");
    return;
  }

  const speed = distance / time;
  showResult(`Farten är ${speed.toFixed(2)} knop.`);
}

function calculateDistance() {
  const speed = getNumber("speed");
  const time = getNumber("time");

  if (!speed || !time) {
    showResult("Fyll i fart och tid.");
    return;
  }

  const distance = speed * time;
  showResult(`Distansen är ${distance.toFixed(2)} nautiska mil.`);
}

function calculateTime() {
  const distance = getNumber("distance");
  const speed = getNumber("speed");

  if (!distance || !speed) {
    showResult("Fyll i distans och fart.");
    return;
  }

  const time = distance / speed;
  showResult(`Tiden är ${time.toFixed(2)} timmar.`);
}

function showResult(message) {
  document.getElementById("result").textContent = message;
}

function clearFields() {
  document.getElementById("distance").value = "";
  document.getElementById("time").value = "";
  document.getElementById("speed").value = "";
  document.getElementById("result").textContent = "";
}

function calculateNauticalDistance() {
  const lat1 = getNumber("lat1");
  const lon1 = parseFloat(document.getElementById("lon1").value);
  const lat2 = getNumber("lat2");
  const lon2 = parseFloat(document.getElementById("lon2").value);

  if (!lat1 || isNaN(lon1) || !lat2 || isNaN(lon2)) {
    document.getElementById("mapResult").textContent =
      "Fyll i alla koordinater.";
    return;
  }

  const distanceNm = haversineNauticalMiles(lat1, lon1, lat2, lon2);

  document.getElementById("mapResult").textContent =
    `Avståndet är cirka ${distanceNm.toFixed(2)} nautiska mil.`;
}

function haversineNauticalMiles(lat1, lon1, lat2, lon2) {
  const earthRadiusNm = 3440.065;

  const toRadians = degrees => degrees * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusNm * c;
}

