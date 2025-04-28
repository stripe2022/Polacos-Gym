let db;

document.addEventListener('DOMContentLoaded', () => {
  let request = indexedDB.open('polacosGymDB', 1);

  request.onupgradeneeded = function(event) {
    db = event.target.result;
    let objectStore = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    mostrarClientes();
  };

  request.onerror = function(event) {
    console.error('Error abriendo base de datos', event);
  };

  document.getElementById('clientForm').addEventListener('submit', guardarCliente);
  document.getElementById('btnShowForm').addEventListener('click', toggleForm);
  document.getElementById('btnAddPhoto').addEventListener('click', () => {
    document.getElementById('inputPhoto').click();
  });
  document.getElementById('inputPhoto').addEventListener('change', cargarFoto);
  document.getElementById('searchInput').addEventListener('input', buscarCliente);
  document.getElementById('closeQrBtn').addEventListener('click', () => {
    document.getElementById('qrContainer').style.display = 'none';
  });
});

function toggleForm() {
  const form = document.getElementById('formContainer');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  limpiarFormulario();
}

function cargarFoto(event) {
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('inputPhoto').dataset.image = e.target.result;
  };
  reader.readAsDataURL(event.target.files[0]);
}

function guardarCliente(e) {
  e.preventDefault();
  const id = document.getElementById('clientId').value;
  const nombre = document.getElementById('nombre').value;
  const apellido = document.getElementById('apellido').value;
  const fechaInscripcion = document.getElementById('fechaInscripcion').value;
  const telefono = document.getElementById('telefono').value;
  const peso = parseFloat(document.getElementById('peso').value);
  const pesoLibras = peso * 2.20462;
  const foto = document.getElementById('inputPhoto').dataset.image || '';

  const cliente = {
    nombre,
    apellido,
    fechaInscripcion,
    vencimiento: sumar30Dias(fechaInscripcion),
    telefono,
    peso,
    pesoLibras: pesoLibras.toFixed(2),
    foto,
    qr: generarQR(nombre, telefono)
  };

  const transaction = db.transaction(['clientes'], 'readwrite');
  const objectStore = transaction.objectStore('clientes');

  if (id) {
    cliente.id = Number(id);
    objectStore.put(cliente);
  } else {
    objectStore.add(cliente);
  }

  transaction.oncomplete = function() {
    mostrarClientes();
    document.getElementById('formContainer').style.display = 'none';
    limpiarFormulario();
  };
}

function sumar30Dias(fecha) {
  let nuevaFecha = new Date(fecha);
  nuevaFecha.setDate(nuevaFecha.getDate() + 30);
  return nuevaFecha.toISOString().substr(0, 10);
}

function limpiarFormulario() {
  document.getElementById('clientForm').reset();
  document.getElementById('inputPhoto').dataset.image = '';
  document.getElementById('clientId').value = '';
}

function mostrarClientes() {
  const container = document.getElementById('clientsContainer');
  container.innerHTML = '';

  const transaction = db.transaction(['clientes'], 'readonly');
  const objectStore = transaction.objectStore('clientes');

  objectStore.openCursor().onsuccess = function(event) {
    const cursor = event.target.result;
    if (cursor) {
      const cliente = cursor.value;
      const div = document.createElement('div');
      div.className = 'clientCard';

      div.innerHTML = `
        <img src="${cliente.foto || 'icon-192.png'}" alt="Foto cliente">
        <div class="clientInfo">
          <strong>${cliente.nombre} ${cliente.apellido}</strong><br>
          <small>Tel: ${cliente.telefono}</small><br>
          <small class="${esVencido(cliente.vencimiento) ? 'expired' : ''}">Vence: ${cliente.vencimiento}</small>
        </div>
        <div class="actionButtons">
          <button onclick="mostrarQR('${cliente.qr}')">QR</button>
          <button onclick="editarCliente(${cliente.id})">Editar</button>
          <button style="background:green;" onclick="pagarCliente(${cliente.id})">Pagar</button>
          <button style="background:red;" onclick="borrarCliente(${cliente.id})">Borrar</button>
        </div>
      `;
      container.appendChild(div);

      cursor.continue();
    }
  };
}

function esVencido(vencimiento) {
  const hoy = new Date();
  const fechaVencimiento = new Date(vencimiento);
  return hoy > fechaVencimiento;
}

function generarQR(nombre, telefono) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${nombre}_${telefono}`;
}

function mostrarQR(qrUrl) {
  document.getElementById('qrImage').src = qrUrl;
  document.getElementById('qrContainer').style.display = 'flex';
}

function editarCliente(id) {
  const transaction = db.transaction(['clientes'], 'readonly');
  const objectStore = transaction.objectStore('clientes');

  const request = objectStore.get(id);
  request.onsuccess = function(event) {
    const cliente = event.target.result;
    document.getElementById('formContainer').style.display = 'block';
    document.getElementById('clientId').value = cliente.id;
    document.getElementById('nombre').value = cliente.nombre;
    document.getElementById('apellido').value = cliente.apellido;
    document.getElementById('fechaInscripcion').value = cliente.fechaInscripcion;
    document.getElementById('telefono').value = cliente.telefono;
    document.getElementById('peso').value = cliente.peso;
    document.getElementById('pesoLibras').value = cliente.pesoLibras;
    document.getElementById('inputPhoto').dataset.image = cliente.foto;
  };
}

function pagarCliente(id) {
  if (!confirm('¿Seguro que quieres pagar y extender 30 días?')) return;
  
  const transaction = db.transaction(['clientes'], 'readwrite');
  const objectStore = transaction.objectStore('clientes');

  const request = objectStore.get(id);
  request.onsuccess = function(event) {
    const cliente = event.target.result;
    cliente.vencimiento = sumar30Dias(cliente.vencimiento);
    objectStore.put(cliente);

    transaction.oncomplete = () => {
      mostrarClientes();
    };
  };
}

function borrarCliente(id) {
  if (!confirm('¿Seguro que quieres borrar este cliente?')) return;
  
  const transaction = db.transaction(['clientes'], 'readwrite');
  const objectStore = transaction.objectStore('clientes');
  objectStore.delete(id);

  transaction.oncomplete = () => {
    mostrarClientes();
  };
}

function buscarCliente() {
  const texto = document.getElementById('searchInput').value.trim().toLowerCase();
  const container = document.getElementById('clientsContainer');
  container.innerHTML = '';

  if (!texto) return;

  const transaction = db.transaction(['clientes'], 'readonly');
  const objectStore = transaction.objectStore('clientes');

  objectStore.openCursor().onsuccess = function(event) {
    const cursor = event.target.result;
    if (cursor) {
      const cliente = cursor.value;
      const nombreCompleto = (cliente.nombre + ' ' + cliente.apellido).toLowerCase();
      const telefono = cliente.telefono.toLowerCase();

      if (nombreCompleto.includes(texto) || telefono.includes(texto)) {
        const div = document.createElement('div');
        div.className = 'clientCard';

        div.innerHTML = `
          <img src="${cliente.foto || 'icon-192.png'}" alt="Foto cliente">
          <div class="clientInfo">
            <strong>${cliente.nombre} ${cliente.apellido}</strong><br>
            <small>Tel: ${cliente.telefono}</small><br>
            <small class="${esVencido(cliente.vencimiento) ? 'expired' : ''}">Vence: ${cliente.vencimiento}</small>
          </div>
          <div class="actionButtons">
            <button onclick="mostrarQR('${cliente.qr}')">QR</button>
            <button onclick="editarCliente(${cliente.id})">Editar</button>
            <button style="background:green;" onclick="pagarCliente(${cliente.id})">Pagar</button>
            <button style="background:red;" onclick="borrarCliente(${cliente.id})">Borrar</button>
          </div>
        `;
        container.appendChild(div);
      }

      cursor.continue();
    }
  };
}