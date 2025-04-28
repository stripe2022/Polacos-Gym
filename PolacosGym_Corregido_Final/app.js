
// Base de datos local
let db = [];

// Obtener elementos
const addClientBtn = document.getElementById('add-client-btn');
const scanQrBtn = document.getElementById('scan-qr-btn');
const searchInput = document.getElementById('search-input');
const clientsList = document.getElementById('clients-list');
const formSection = document.getElementById('form-section');
const clientForm = document.getElementById('client-form');
const firstNameInput = document.getElementById('first-name');
const lastNameInput = document.getElementById('last-name');
const phoneInput = document.getElementById('phone');
const registrationDateInput = document.getElementById('registration-date');
const weightKgInput = document.getElementById('weight-kg');
const weightLbInput = document.getElementById('weight-lb');
const photoInput = document.getElementById('photo-input');
const formTitle = document.getElementById('form-title');
const qrView = document.getElementById('qr-view');
const qrImage = document.getElementById('qr-image');
const closeQrBtn = document.getElementById('close-qr-btn');
const qrReader = document.getElementById('qr-reader');
const cancelQrBtn = document.getElementById('cancel-qr-btn');

let editingClientId = null;

addClientBtn.addEventListener('click', () => {
  formTitle.textContent = 'Nuevo Cliente';
  formSection.classList.remove('hidden');
  clientForm.reset();
  editingClientId = null;
});

scanQrBtn.addEventListener('click', () => {
  qrReader.classList.remove('hidden');
  const html5QrCode = new Html5Qrcode("qr-reader-box");
  Html5Qrcode.getCameras().then(cameras => {
    if (cameras && cameras.length) {
      html5QrCode.start(
        cameras[0].id,
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
          alert(`QR Escaneado: ${qrCodeMessage}`);
          html5QrCode.stop();
          qrReader.classList.add('hidden');
        }
      );
    }
  });
});

cancelQrBtn.addEventListener('click', () => {
  window.location.reload();
});

clientForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newClient = {
    id: editingClientId || Date.now(),
    firstName: firstNameInput.value,
    lastName: lastNameInput.value,
    phone: phoneInput.value,
    registrationDate: registrationDateInput.value,
    weightKg: weightKgInput.value,
    weightLb: (weightKgInput.value * 2.20462).toFixed(2),
    photo: photoInput.files[0] ? URL.createObjectURL(photoInput.files[0]) : '',
    vencimiento: new Date(new Date(registrationDateInput.value).getTime() + 30*24*60*60*1000).toISOString().split('T')[0],
  };

  if (editingClientId) {
    db = db.map(c => c.id === editingClientId ? newClient : c);
  } else {
    db.push(newClient);
  }

  formSection.classList.add('hidden');
  renderClients();
});

searchInput.addEventListener('input', () => {
  if (searchInput.value.trim() === '') {
    clientsList.innerHTML = '';
    return;
  }
  renderClients();
});

function renderClients() {
  clientsList.innerHTML = '';
  db.filter(c =>
    c.firstName.toLowerCase().includes(searchInput.value.toLowerCase()) ||
    c.phone.includes(searchInput.value)
  ).forEach(client => {
    const card = document.createElement('div');
    card.className = 'client-card';

    const info = document.createElement('div');
    info.className = 'client-info';

    const img = document.createElement('img');
    img.src = client.photo || 'https://via.placeholder.com/50';
    img.className = 'client-photo';

    const name = document.createElement('div');
    name.textContent = `${client.firstName} ${client.lastName}`;

    const vencimiento = document.createElement('div');
    vencimiento.textContent = `Vence: ${client.vencimiento}`;
    vencimiento.className = new Date(client.vencimiento) < new Date() ? 'vencido' : '';

    info.appendChild(img);
    info.appendChild(name);
    info.appendChild(vencimiento);

    const buttons = document.createElement('div');

    const qrBtn = document.createElement('button');
    qrBtn.textContent = 'QR';
    qrBtn.onclick = () => showQr(client.id);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.onclick = () => editClient(client.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Borrar';
    deleteBtn.onclick = () => confirmDelete(client.id);

    const payBtn = document.createElement('button');
    payBtn.textContent = 'Pagar';
    payBtn.style.backgroundColor = 'green';
    payBtn.onclick = () => confirmPay(client.id);

    buttons.appendChild(payBtn);
    buttons.appendChild(editBtn);
    buttons.appendChild(qrBtn);
    buttons.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(buttons);
    clientsList.appendChild(card);
  });
}

function confirmDelete(id) {
  if (confirm('¿Estás seguro de realizar esta acción?')) {
    db = db.filter(c => c.id !== id);
    renderClients();
  }
}

function confirmPay(id) {
  if (confirm('¿Estás seguro de realizar esta acción?')) {
    db = db.map(c => {
      if (c.id === id) {
        const nuevaFecha = new Date(c.vencimiento);
        nuevaFecha.setDate(nuevaFecha.getDate() + 30);
        return {...c, vencimiento: nuevaFecha.toISOString().split('T')[0]};
      }
      return c;
    });
    renderClients();
  }
}

function showQr(id) {
  const client = db.find(c => c.id === id);
  if (!client) return;
  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, `${client.firstName} ${client.lastName} ${client.phone}`, { width: 300 }, function () {
    qrImage.src = canvas.toDataURL();
    qrView.classList.remove('hidden');
  });
}

closeQrBtn.addEventListener('click', () => {
  qrView.classList.add('hidden');
});

function editClient(id) {
  const client = db.find(c => c.id === id);
  if (!client) return;
  editingClientId = client.id;
  formTitle.textContent = 'Editar Cliente';
  formSection.classList.remove('hidden');
  firstNameInput.value = client.firstName;
  lastNameInput.value = client.lastName;
  phoneInput.value = client.phone;
  registrationDateInput.value = client.registrationDate;
  weightKgInput.value = client.weightKg;
  weightLbInput.value = client.weightLb;
}
