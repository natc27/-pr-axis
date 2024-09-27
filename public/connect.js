function connectAxis(options = {}) {
  const groupId = options.groupId || 'axis';
  const port = options.port || 5080;
  const id = options.id || Math.round(Math.random() * 1000);
  const target =
    options.target ||
    ((d) => {
      console.log(d);
    });
  const isSecure = false;
  const vector = [];
  timestep = 0;

  /** extract server url */
  const url =
    window.location.hostname === 'localhost'
      ? 'ws://localhost:' + port
      : isSecure
      ? 'wss://' + window.location.hostname + ':' + port
      : 'ws://' + window.location.hostname + ':' + port;

  /** start websocket and connect to url */
  const ws = new WebSocket(url);

  ws.onopen = function () {
    console.log(`opening websocket to ${url}`);
    /** we are expecting arraybuffers, data wrapped into bytes */
    ws.binaryType = 'arraybuffer';
    /**
     * we are using msgpack to serialize
     * and deserialize data and send as bytes, string
     * formated data is ignored on the server.
     */
    ws.send(msgpack.serialize({ address: 'subscribe', args: { id: 'axis-web' } })); /** OK */
    // ws.send({ register: 'abc', id: 123 }); /** ignored */
  };

  /** incoming messages are received here, we expect
   * bytes and not strings. data is deserialised with
   * the msgpack library by https://github.com/ygoe/msgpack.js
   * and must be included locally (on the server).
   */
  ws.onmessage = function (ev) {
    const packet = msgpack.deserialize(ev.data);
    const { address, args } = packet;
    if (address === 'pn') {
      args.forEach((el) => {
        args[0].data.RightHand.unshift(timestep);
        vector.push(args[0].data.RightHand);
        target(el);
      });
      timestep = timestep + 0.5;
    }
    if (address === 'settings') {
      console.log(args);
      document.getElementById('settings-label').innerHTML = args.label;
      document.getElementById('settings-json').innerHTML = JSON.stringify(args.broadcast, null, 2);
    } else {
      /** else we received maybe a system message */
    }
  };
  
  ws.onclose = function(ev){
    console.log(vector);
    arrayObjToCsv(vector);
  }
}



function arrayObjToCsv(ar) {
	//comprobamos compatibilidad
	if(window.Blob && (window.URL || window.webkitURL)){
		var contenido = "",
			d = new Date(),
			blob,
			reader,
			save,
			clicEvent;
		//creamos contenido del archivo
		for (var i = 0; i < ar.length; i++) {
			//construimos cabecera del csv
			if (i == 0)
				contenido += ["timestamp", "y", "x", "z"].join(",") + "\n";
			//resto del contenido
			contenido += Object.keys(ar[i]).map(function(key){
							return ar[i][key];
						}).join(",") + "\n";
		}
		//creamos el blob
		blob =  new Blob(["\ufeff", contenido], {type: 'text/csv'});
		//creamos el reader
		var reader = new FileReader();
		reader.onload = function (event) {
			//escuchamos su evento load y creamos un enlace en dom
			save = document.createElement('a');
			save.href = event.target.result;
			save.target = '_blank';
			//aquí le damos nombre al archivo
			save.download = "datos.csv";
			try {
				//creamos un evento click
				clicEvent = new MouseEvent('click', {
					'view': window,
					'bubbles': true,
					'cancelable': true
				});
			} catch (e) {
				//si llega aquí es que probablemente implemente la forma antigua de crear un enlace
				clicEvent = document.createEvent("MouseEvent");
				clicEvent.initEvent('click', true, true);
			}
			//disparamos el evento
			save.dispatchEvent(clicEvent);
			//liberamos el objeto window.URL
			(window.URL || window.webkitURL).revokeObjectURL(save.href);
		}
		//leemos como url
		reader.readAsDataURL(blob);
	}else {
		//el navegador no admite esta opción
		alert("Su navegador no permite esta acción");
	}
};
