async function decodeOnLoad() {
    try {
      let encodedURL = window.location.search

      if (window.location.search[0] == '?') {
          encodedURL = encodedURL.slice(1);
      }
      
      const urlData = JSON.parse(decodeURI(encodedURL)).data
      await fillTeamData(await decodeData(urlData))
    } catch {console.log('error')}
  } decodeOnLoad();

  navigator.serviceWorker.register("sw.js").then((r) => r.update());

  const numInputs = 'input:not([type="text"], [type="checkbox"])';

  function resizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = (textarea.scrollHeight) + "px";
  }

  function toggleAStop() {
    document.getElementById("a-reason").disabled = !document.getElementById("a-stop").checked;
  }

  function toggleEStop() {
    document.getElementById("e-reason").disabled = !document.getElementById("e-stop").checked;
  }

  function openQRCode() {
    generateQRCode();
    document.getElementById('qrcode-container').style.display = 'block';
  }

  function closeQRCode() {
    document.getElementById('qrcode-container').style.display = 'none';
  }

  function openCamera() {navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        document.getElementById('cameraStream').srcObject = stream;
        document.getElementById('camera').style.display = 'flex';
      }).catch();
  }

  function closeCamera() {
    document.getElementById('cameraStream').srcObject.getTracks().forEach(track => track.stop());
    document.getElementById('camera').style.display = 'none';
  }

  function dataObject() {
    var teamData = {
      "team": document.getElementById("team").value,
      "auto": {
        "left-zone": document.getElementById("left-zone").checked,
        "a-stop": document.getElementById("a-stop").checked,
        "a-reason": document.getElementById("a-reason").value,
        "succeed": {},
        "fail": {},
        "method": {}
      },
      "teleop": {
        "e-stop": document.getElementById("e-stop").checked,
        "e-reason": document.getElementById("e-reason").value,
        "succeed": {},
        "fail": {},
        "method": {}
      }
    }

    for (let num of document.querySelectorAll(`${numInputs}:not(#team), textarea`)) {
      let tr = num.closest("tr");
      let sec = tr.closest("table").dataset['sec'];
      let cat = tr.dataset['cat'];
      let con = num.getAttribute('con');

      teamData[sec][cat][con] = num.value;
      num.setAttribute('id', `${sec}-${cat}-${con}`);
    }
    
    return teamData;
  }

  function generateQRCode() {
    teamData = dataObject();

    const stream = new Blob([JSON.stringify(teamData)], { type: 'application/json' }).stream();
    const compressedReadableStream = stream.pipeThrough(new CompressionStream("gzip"));
    const blob = new Response(compressedReadableStream).blob();

    blob.then((b) => {
      b.arrayBuffer().then((arrayBuffer) => {
        const baseSixtyFourString = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        document.getElementById("qrcode").innerHTML = "";
        let qrcodeDataObject = { "ver": 1, "data": baseSixtyFourString }

        new QRCode(document.getElementById("qrcode"), {
          text: `https://team-4536.github.io/ScoutingApp/?${JSON.stringify(qrcodeDataObject)}`,
          correctLevel: QRCode.CorrectLevel.Q,
          width: 400,
          height: 400
        });
      })
    })
  }

  async function decodeData(encodedData) {
    try {
      let bytes = Uint8Array.from(atob(encodedData), c => c.charCodeAt(0));
      let blob = new Blob([bytes]);
      let decoder = blob.stream().pipeThrough(new DecompressionStream("gzip"));
      blob = await new Response(decoder).blob();
      let text = await blob.text();
      return JSON.parse(text);
    } catch {}
  }

  async function fillTeamData(teamData) {
    dataObject();

    var con = ['succeed', 'fail', 'method'];
    var cat = ['amp', 'spkr', 'flr', 'src', 'clmb', 'trp'];

    console.log(JSON.stringify(teamData, null, 4))

    // document.getElementById("team").value = teamData.team;
    // document.getElementById("left-zone").checked = teamData.auto.left-zone;
    // document.getElementById("a-stop").checked = teamData.auto.a-stop;
    // document.getElementById("a-reason").value = teamData.auto.a-reason;
    // document.getElementById("e-stop").checked = teamData.teleop.e-stop;
    // document.getElementById("e-reason").value = teamData.teleop.e-reason;
    
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        try {
          document.getElementById(`auto-${con[a]}-${cat[b]}`).value = teamData.auto[con[a]][cat[b]];
        } catch {}
      }
    }

    for (let c = 0; c < 3; c++) {
      for (let d = 0; d < 6; d++) {
        try {
          document.getElementById(`teleop-${con[c]}-${cat[d]}`).value = teamData.teleop[con[c]][cat[d]];
        } catch {}
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll(numInputs).forEach(function (input) {
      input.placeholder = "0";
      input.type = "number";
      input.min = "0";
    });

    document.getElementById('team').placeholder = "0000";

    document.querySelectorAll('textarea').forEach(function (textarea) {
      textarea.addEventListener("input", function () {
        resizeTextarea(textarea);
      });
    });

    document.querySelectorAll(numInputs).forEach(function (input) {
      input.addEventListener("input", function (event) {
          event.target.value = event.target.value.replace(/\D/g, '');
      });
    });

    document.getElementById('team').addEventListener('input', function (event) {
      value = event.target.value;

      try {
        if (parseInt(value) > 9999) {
          if (value != '10000') {
            event.target.value = event.target.value.slice(0, -1);
          } else {
            event.target.value = '9999';
          }
        }

        if (value.length < 4) {
          event.target.value = '0'.repeat(4 - value.length) + event.target.value;
        } else if (value.length > 4 && value[0] == '0') {
          event.target.value = value.slice(1);
        }
      } catch {}
    });

    document.querySelectorAll(`${numInputs}:not(#team)`).forEach(function (input) {
      input.addEventListener('input', function (event) {
        console.log(event.target.value[0])

        if (event.target.value[0] == '0') {
          event.target.value = event.target.value.slice(1);
        }

        try {
          if (parseInt(event.target.value) > 999) {
            event.target.value = '999';
            console.log('nkgjfgdsetfywuyf')
          }
        } catch {}
      });
    });
  });