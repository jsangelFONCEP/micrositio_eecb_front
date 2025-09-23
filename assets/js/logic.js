let CURRENT_VIEW, ENTITIES_INIT_SELECT = {}, ENTITIES = {}, CURRENT_SESSION, LOADING, OVERLAY_BLUR;

// let ROUTE_API = 'http://10.160.3.244:82/controllers/';
let ROUTE_API = 'http://localhost/FONCEP/MICROSITIO/api.foncep.gov.co/api.foncep.gov.co/controllers/';

//UTILS
class Utils {
    static truncateText(textValue, maxLength) {
        if (textValue.length <= maxLength) {
            return textValue;
        }
        return textValue.slice(0, maxLength - 3) + '...';
    }
}
// VIEWS
class ViewController {
    overlay = null;
    constructor() {
        this.backgroundContent = document.getElementById('containerMicrositeEECB');
    }

    createOverlay() {
        if (this.overlay) this.overlay.remove();
        this.overlay = document.createElement('div')
        this.overlay.classList.add('overlay')
        this.overlay.setAttribute('id', 'overlay')
        this.backgroundContent.appendChild(this.overlay);
    }

    showView(viewId, data = {}, cb = () => { }) {
        const viewsElements = this.backgroundContent.getElementsByClassName('viewContainer');
        const viewsKeys = Object.keys(viewsElements);
        viewsKeys.forEach((key) => {
            const viewElement = viewsElements[key];
            const id = viewElement.getAttribute('id');
            if (viewId == id) viewElement.classList.add('active');
            else viewElement.classList.remove('active');
        });
        this.createOverlay();
        cb();
        this.initializateView(viewId, data);
    }

    initializateView(viewId, data) {
        switch (viewId) {
            case 'mainView':
                CURRENT_VIEW = new MainView();
                return;
            case 'registerView':
                CURRENT_VIEW = new RegisterView(data.entityId);
                return;
            case 'messageView':
                CURRENT_VIEW = new MessageView(data.title, data.body);
                return;
            case 'dashboardView':
                CURRENT_VIEW = new DashboardView();
                return;
        }
    }

    blurBackContent(state) {
        if (state) {
            this.overlay.classList.add('active');
            this.backgroundContent.classList.add('blurred');
        } else {
            this.overlay.classList.remove('active');
            this.backgroundContent.classList.remove('blurred');
        }
    }
}
const VIEW_CONTROLLER = new ViewController();
// CARDS
class CardAnimationController {
    constructor(cardId, cbExpanded = () => { }, cbCollapsed = () => { }) {
        this.card = document.getElementById(cardId);
        if (!this.card) console.error('No se pudo inicializar card => ' + cardId);
        this.cbCollapsed = cbCollapsed;
        this.cbExpanded = cbExpanded;
        this.expandedCard = null;
        this.originalPosition = {};
        this.init();
    }

    init() {
        this.card.addEventListener('click', (e) => {
            if (!this.card.classList.contains('expanded')) {
                this.expandCard(this.card);
            }
        });

        VIEW_CONTROLLER.overlay.addEventListener('click', () => {
            if (this.expandedCard) {
                this.collapseCard(this.expandedCard);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.expandedCard) {
                this.collapseCard(this.expandedCard);
            }
        });
    }

    expandCard(card) {
        const rect = card.getBoundingClientRect();
        this.originalPosition = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
        };
        VIEW_CONTROLLER.blurBackContent(true);
        card.classList.add('expanded');
        this.expandedCard = card;
        this.cbExpanded();
    }

    collapseCard(card) {
        card.classList.remove('expanded');
        VIEW_CONTROLLER.blurBackContent(false);
        this.expandedCard = null;
        this.cbCollapsed();
    }
}

// SELECT

class CustomSelectController {
    isActive = true;
    constructor(selectId) {
        this.container = document.getElementById(selectId);
        this.options = [];
        if (!this.container) console.error('No se pudo inicializar select => ' + selectId);
        const inputsList = this.container.getElementsByClassName('input');
        if (inputsList.length == 0) console.error(`El select ${selectId} no contiene input`);
        this.input = inputsList[0];
        const containersOptions = this.container.getElementsByClassName('container-options');
        if (containersOptions.length == 0) console.error(`El select ${selectId} no contiene contenedor de opciones`);
        this.containerOptions = containersOptions[0];
        this.init();
    }

    init() {
        this.input.addEventListener('click', () => {
            this.handleShowOptions(0, !this.containerOptions.classList.value.includes('show'))
        });

        this.input.addEventListener('focusout', () => {
            setTimeout(() => {
                this.handleShowOptions(0, false)
            }, 300);
        });
    }

    handleShowOptions(type, state) {
        if (!this.isActive) return;
        const TYPES = ['show', 'blockshow'];
        if (state) this.containerOptions.classList.add(TYPES[type]);
        else this.containerOptions.classList.remove(TYPES[type]);
    }

    loadOptions(options, refText, actionClick = () => { }) {
        this.containerOptions.innerHTML = '';
        this.options = options;
        const keysOptions = Object.keys(options)
        keysOptions.forEach((key) => {
            const item = this.options[key];
            const containerOption = this.createOption(item[refText], key, actionClick);
            this.containerOptions.appendChild(containerOption);
        });
    }

    createOption(text, value, func) {
        const containerOption = document.createElement('div');
        containerOption.classList.add('select-option');
        containerOption.innerText = '•  '+text;
        containerOption.setAttribute('value', value);
        containerOption.addEventListener('click', async (e) => {
            func(e);
        })
        return containerOption;
    }
}

class MainView {
    select = null;
    containerForm = null;
    card1 = null;
    card2 = null;
    formLogin = null;
    constructor() {
        this.select = new CustomSelectController('selectEntity');
        this.containerForm = document.getElementById('containerContentEntity');
        this.init()
    }

    async init() {
        await this.loadEntities();
        const eventExpandedCard1 = () => {
            this.select.handleShowOptions(1, true);
            this.containerForm.style.height = (this.containerForm.scrollHeight + 15) + 'px';
        }
        const eventCollapsedCard1 = () => {
            this.select.handleShowOptions(1, false);
            this.select.handleShowOptions(0, false);
            this.containerForm.style.height = 'auto';
        }
        this.card1 = new CardAnimationController('card1', eventExpandedCard1, eventCollapsedCard1);
        this.card2 = new CardAnimationController('card2');

        this.formLogin = new FormLoginController();

        this.select.loadOptions(ENTITIES_INIT_SELECT, 'nombre', (e) => {
            LOADING.openFor();
            const entityId = e.target.getAttribute('value');
            VIEW_CONTROLLER.showView('registerView', { entityId });
        });
    }

    async loadEntities() {
        const res = await JsonResponseHandler.get(ROUTE_API + 'EntidadController.php', {
            action: 'show'
        });
        if (res.success) {
            for (let entity of res.data) {
                if (!entity.id) ENTITIES_INIT_SELECT[entity.identificador] = entity;
                ENTITIES[entity.identificador] = entity;
            }
        }
    }
}

class FormLoginController {
    btnId = 'btnLogin';
    formFields = {
        txt_EmailLogin: {
            validations: {
                required: true,
            }
        },
        txt_PasswordLogin: {
            validations: {
                required: true,
            }
        },
    };
    constructor() {
        this.btn = document.getElementById(this.btnId);
        this.init();
    }

    init() {
        this.initFields();
        this.btn.addEventListener('click', () => {
            this.sendData();
        })
    }

    initFields() {
        const keys = Object.keys(this.formFields);
        keys.forEach((key) => {
            this.formFields[key]['class'] = new AbstractInput(key, this.formFields[key].validations, this)
        });
    }

    validateForm() {
        const form = new FormData();
        const keysFields = Object.keys(this.formFields);
        let errors = 0;
        for (let keyInput of keysFields) {
            if (!this.formFields[keyInput].class.validateValue()) errors++;
            form.append(keyInput, this.formFields[keyInput].class.element.value)
        }
        form.append('action', 'login');
        return (errors > 0) ? null : form;
    }

    async sendData() {
        LOADING.open();
        const form = await this.validateForm();
        if (form) {
            const res = await JsonResponseHandler.post(ROUTE_API + 'LoginController.php', form);
            if (res.success) {
                if (res.data[0]) {
                    CURRENT_SESSION = new SessionController(res.data[0], res.data[1]);
                    VIEW_CONTROLLER.showView('dashboardView');
                } else console.error('USUARIO O CONTRASEÑA MAL')
            } else console.error('ERROR')
        }
        setTimeout(() => { LOADING.close(); }, 700)
    }
}

class SessionController {
    constructor(idUser, token) {
        // this.cryptoHelper = null;
        this.tokenVar = {
            user: idUser,
            token: token
        }
        this.init();
    }
    async init() {
        // this.cryptoHelper = new CryptoHelper(Date.now() + '_' + this.tokenVar.user);
        this.setVariable();
    }

    async setVariable() {
        const tokenStorage = JSON.stringify(this.tokenVar);
        // const encrypted = await this.cryptoHelper.encrypt(tokenStorage);
        // localStorage.setItem("dataToken", encrypted);
        localStorage.setItem("dataToken", tokenStorage);
    }

    static async getVariable() {
        const tokenStorage = await localStorage.getItem("dataToken");
        if (!tokenStorage) return null;
        // const decrypted = await this.cryptoHelper.decrypt(tokenStorage);
        // return JSON.parse(decrypted);
        return JSON.parse(tokenStorage);
    }

    static async removeVariable() {
        localStorage.removeItem("dataToken");
    }

}

class CryptoHelper {
    constructor(password) {
        this.password = password;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    async deriveKey(salt) {
        const baseKey = await crypto.subtle.importKey(
            "raw",
            this.encoder.encode(this.password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(plainText) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await this.deriveKey(salt);

        const encrypted = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            this.encoder.encode(plainText)
        );
        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv)),
            salt: btoa(String.fromCharCode(...salt))
        };
    }

    async decrypt(encryptedData) {
        const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
        const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
        const key = await this.deriveKey(salt);

        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv
            },
            key,
            data
        );

        return this.decoder.decode(decrypted);
    }
}


class RegisterView {
    id = 'registerView';
    titleId = 'titleCardRegister';
    form = null;

    constructor(entityId = null) {
        this.entity = (entityId) ? ENTITIES[entityId] : null;
        if (!this.entity) console.error('Error al cargar la entidad');
        this.title = document.getElementById(this.titleId);
        this.init();
    }

    init() {
        this.title.innerText = this.entity.nombre;
        this.form = new FormRegisterController(this.entity, this);
    }

}

class MessageView {
    id = 'messageView';
    titleId = 'titleCardMessage';
    bodyId = 'bodyCardMessage';
    btnId = 'btnBackMainView';

    constructor(title, body) {
        this.title = document.getElementById(this.titleId);
        this.title.innerText = title;
        this.body = document.getElementById(this.bodyId);
        this.body.innerHTML = body;
        this.btn = document.getElementById(this.btnId);
        this.init()
    }

    init() {
        this.btn.addEventListener('click', () => {
            window.location.reload();
        });
    }
}

class DashboardView {
    id = 'dashboardView';
    titleId = 'titleDashboard';
    enititiesContainerId = 'enititiesContainer';
    btnLogoutId = 'btnLogout';
    entityLoggedName = '';

    constructor() {
        this.title = document.getElementById(this.titleId);
        this.enititiesContainer = document.getElementById(this.enititiesContainerId);
        this.btnLogout = document.getElementById(this.btnLogoutId);
        this.entitiesList = {};
        this.init();
    }

    async init() {
        console.log("🚀 ~ DashboardView ~ init ~ CURRENT_SESSION:", CURRENT_SESSION)
        const infoSession = await SessionController.getVariable();
        console.log("🚀 ~ DashboardView ~ init ~ infoSession:", infoSession)
        if (infoSession) {
            await this.loadEntities(infoSession.user);
        } else console.error('CERRAR SESIÓN');
        this.title.innerText = 'Bienvenido(a) ' + this.entityLoggedName + ":";
        this.btnLogout.addEventListener('click', () => {
            SessionController.removeVariable();
            window.location.reload();
        })
    }

    async loadEntities(userId) {
        const res = await JsonResponseHandler.get(ROUTE_API + 'ArchivoController.php', {
            action: 'show',
            userId
        });
        console.log("🚀 ~ DashboardView ~ loadEntities ~ res:", res)
        if (res.success) {
            if (res.data.entities.length > 0) {
                for (let item of res.data.entities) {
                    const option = await this.createEntity(item.nombre, item);
                    this.enititiesContainer.appendChild(option);
                }
            } else this.enititiesContainer.innerHTML = '<div class="message-no-entities nunito-bold">Su entidad no genera reportes de adeudos</div>';
            this.entityLoggedName = res.data.user_entity;
            return;
        } else console.error('CERRAR SESIÓN');
    }

    async createEntity(name, entity) {
        const entityContElement = document.createElement('div');
        entityContElement.classList.add('col-md-4');
        const entityBtnElement = document.createElement('div');
        entityBtnElement.classList.add('itemEntity');
        entityBtnElement.classList.add('bg-main-green');
        entityBtnElement.innerText = name;
        const viewEntityFunc = () => {
            this.viewEntity(entity)
        }
        entityBtnElement.addEventListener('click', () => {
            viewEntityFunc();
        })
        entityContElement.appendChild(entityBtnElement);
        return entityContElement;
    }

    viewEntity(entity) {
        const entityModal = new EntityModalController(entity);
    }
}

class EntityModalController {
    cardId = 'EntityModalCard';
    btnBackModalId = 'btnBackModal';
    titleEntityModalId = 'titleEntityModal';
    lbl_PhoneId = 'lbl_Phone';
    lbl_EmailId = 'lbl_Email';
    lbl_LinkDocumentId = 'lbl_LinkDocument';
    constructor(entity) {
        this.entity = entity;
        this.titleEntityModal = document.getElementById(this.titleEntityModalId);
        this.btnBackModal = document.getElementById(this.btnBackModalId);
        this.card = document.getElementById(this.cardId);
        this.lbl_Phone = document.getElementById(this.lbl_PhoneId);
        this.lbl_Email = document.getElementById(this.lbl_EmailId);
        this.lbl_LinkDocument = document.getElementById(this.lbl_LinkDocumentId);
        this.init();
    }

    init() {
        this.titleEntityModal.innerHTML = this.entity.nombre + '<br> NIT: ' + this.entity.nit;
        this.lbl_Phone.innerText = this.entity.telefono_contacto;
        this.lbl_Email.innerText = this.entity.email_contacto;
        this.lbl_LinkDocument.setAttribute('href', ROUTE_API + 'DownloadFileController.php?id=' + this.entity.id);
        const funcHide = () => {
            this.hide()
        }
        this.btnBackModal.addEventListener('click', () => {
            funcHide();
        })
        this.show();
    }

    show() {
        this.btnBackModal.classList.add('show');
        this.card.classList.add('show');
        OVERLAY_BLUR.show();
    }

    hide() {
        this.btnBackModal.classList.remove('show');
        this.card.classList.remove('show');
        OVERLAY_BLUR.hide();
    }
}

class FormRegisterController {
    entity = null;
    select = null;
    inputFile = null;
    entitiesInSelect = {};
    currentEntityId = null;
    formFields = {
        txt_NIT: {
            validations: {
                required: true,
                maxLength: 20,
                regex: false,
                typeCharacters: 'number',
            }
        },
        slt_TypeEntity: {
            validations: {
                required: true,
            }
        },
        txt_Email: {
            validations: {
                required: true,
                maxLength: 50,
                regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                typeCharacters: false,
            }
        },
        slt_City: {
            validations: {
                required: true,
                maxLength: 50,
                regex: false,
                typeCharacters: false,
            }
        },
        txt_Phone: {
            validations: {
                required: true,
                requiredLength: 10,
                maxLength: 10,
                regex: false,
                typeCharacters: 'number',
            }
        },
        txt_PhoneContact: {
            validations: {
                required: true,
                requiredLength: 10,
                maxLength: 10,
                regex: false,
                typeCharacters: 'number',
            }
        },
        txt_EmailContact: {
            validations: {
                required: true,
                maxLength: 50,
                regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                typeCharacters: false,
            }
        },
        cbx_Politics: {
            validations: {
                required: true,
            }
        },
    };
    fatherFormClass = null;

    constructor(entity, fatherFormClass) {
        this.fatherFormClass = fatherFormClass;
        this.entity = entity
        this.selectedEntities = {};
        this.containerEntities = document.getElementById('containerEntities');
        this.btnForm = document.getElementById('btnSendDataRegister');
        this.btnBack = document.getElementById('btnBack');
        this.init();
    }

    init() {
        this.select = new CustomSelectController('selectEntities');
        this.entitiesInSelect = ENTITIES;
        delete this.entitiesInSelect[this.entity.identificador];
        this.loadOptionsInSelect();
        this.inputFile = new FileManagerInput('fileInputRegister', this, false);
        this.initFields();
        this.btnForm.addEventListener('click', () => {
            this.sendData();
        });
        this.btnBack.addEventListener('click', () => {
            window.location.reload();
        })
    }

    initFields() {
        const keys = Object.keys(this.formFields);
        keys.forEach((key) => {
            this.formFields[key]['class'] = new AbstractInput(key, this.formFields[key].validations, this)
        });
    }

    cleanForm() {
        const keysFields = Object.keys(this.formFields);
        for (let keyInput of keysFields) {
            this.formFields[keyInput].class.element.value = '';
        }
        this.selectedEntities = {};
        this.updateDisplaySelectedEntities();
    }

    loadOptionsInSelect() {
        this.select.loadOptions(this.entitiesInSelect, 'nombre',
            (e) => {
                const entityId = e.target.getAttribute('value');
                this.selectedEntities[entityId] = this.getEntityObject(entityId);
                this.updateDisplaySelectedEntities();
                this.currentEntityId = entityId;
                setTimeout(() => {
                    this.manageStates(false);
                }, 300);
            });
    }

    manageStates(state) {
        this.select.isActive = state;
        this.inputFile.handleStateInput(!state);
    }

    getEntityObject(entityId) {
        return {
            ...this.entitiesInSelect[entityId],
            file: null
        }
    }

    updateDisplaySelectedEntities() {
        const keys = Object.keys(this.selectedEntities);
        this.containerEntities.innerHTML = (keys.length > 0) ? '' : '<div class="flex-center-items h-100 w-100">No hay entidades seleccionadas</div>';
        keys.forEach((item) => {
            const entity = this.selectedEntities[item];
            this.containerEntities.appendChild(
                this.createItemEntity(entity.nombre, entity.identificador, entity.file)
            );
        });
    }

    removeEntity() {
        const entity = this.selectedEntities[this.currentEntityId];
        delete this.selectedEntities[this.currentEntityId];
        this.entitiesInSelect[this.currentEntityId] = entity;
        this.loadOptionsInSelect();
        this.updateDisplaySelectedEntities();
        this.currentEntityId = null;
        this.inputFile.input.value = '';
        setTimeout(() => {
            this.manageStates(true);
        }, 500);
    }

    createItemEntity(text, id, file) {
        const item = document.createElement('label');
        item.innerText = text;
        if (!file) {
            const btnRemove = document.createElement('a');
            btnRemove.classList.add('btn-remove-entity');
            btnRemove.innerText = 'X';
            const funcRemove = () => {
                this.removeEntity();
            }
            btnRemove.addEventListener('click', () => {
                funcRemove();
            });
            item.appendChild(btnRemove);
        }
        item.classList.add('item-entity');
        item.classList.add((file) ? 'bg-main-green' : 'bg-secondary');
        item.classList.add('text-light');
        item.classList.add('text-light');
        item.classList.add('rounded-4');
        item.classList.add('shadow');
        item.classList.add('my-1');
        item.setAttribute('id', `entityItem${id}`);
        return item;
    }

    assignFile(file) {
        if (!this.currentEntityId) {
            console.warn('NO SE HA SELECCIONADO NINGUNA ENTIDAD');
            return;
        } else {
            delete this.entitiesInSelect[this.currentEntityId];
            this.selectedEntities[this.currentEntityId].file = file;
            this.loadOptionsInSelect();
            this.updateDisplaySelectedEntities();
            this.currentEntityId = null;
            this.inputFile.input.value = '';
            setTimeout(() => {
                this.manageStates(true);
            }, 500);
        }
    }

    async validateForm() {
        if (this.currentEntityId) {
            this.inputFile.showMessage('Agregue el archivo para la entidad seleccionada', 'error')
            return false;
        }
        const form = new FormData();
        const keysFields = Object.keys(this.formFields);
        let errors = 0;
        for (let keyInput of keysFields) {
            if (!this.formFields[keyInput].class.validateValue()) errors++;
            form.append(keyInput, this.formFields[keyInput].class.element.value)
        }
        const keysEntities = Object.keys(this.selectedEntities);
        console.log("🚀 ~ FormRegisterController ~ validateForm ~ errors:", errors)
        if (errors > 0) {
            this.inputFile.showMessage('Complete correctamente la información de los campos', 'error')
            return false;
        }
        if (!this.formFields.cbx_Politics.class.element.checked) {
            this.inputFile.showMessage('Acepte la política de privacidad y seguridad de la información', 'error')
            return false;
        }
        if (keysEntities.length > 0) {
            for (let keyEntity of keysEntities) {
                form.append('files[]', this.selectedEntities[keyEntity].file);
            }
            form.append('file_entities', keysEntities.join(','));
        } else {
            this.inputFile.showMessage('Debe agregar al menos una entidad', 'error')
            return false;
        }
        form.append('entidad_id', this.entity.identificador);
        form.append('action', 'create');
        if (!await this.validateNit()) errors++;
        return (errors > 0) ? null : form;
    }

    async validateNit() {
        const form = new FormData();
        form.append('action', 'validateNit');
        form.append('entity_id', this.entity.identificador);
        form.append('nit', this.formFields.txt_NIT.class.element.value);
        console.log("🚀 ~ FormRegisterController ~ validateNit ~ form:", form)
        const res = await JsonResponseHandler.post(ROUTE_API + 'EntidadController.php', form);
        if (res.success) {
            if (res.data.validation) return true;
        }
        console.log("🚀 ~ FormRegisterController ~ validateNit ~ res:", res)
        this.inputFile.showMessage('El número del NIT no corresponde al de la entidad', 'error');
        this.formFields.txt_NIT.class.showAlertInput(false);
        return false;
    }

    async sendData() {
        LOADING.open();
        const form = await this.validateForm();
        if (form) {
            const res = await JsonResponseHandler.post(ROUTE_API + 'RegistroController.php', form);
            console.log("🚀 ~ FormRegisterController ~ sendData ~ res:", res)
            if (res.success) {
                VIEW_CONTROLLER.showView('messageView',
                    {
                        title: this.entity.nombre,
                        body: `Muchas gracias por su inscripción de datos,
                                le confirmamos que al correo:  
                                <b>${form.get('txt_Email')}</b>, le
                                llegará el usuario y contraseña para
                                consultar los estados de cuentas.`
                    });
            } else console.error('ERROR')
        }
        setTimeout(() => { LOADING.close(); }, 500)
    }
}

class FileManagerInput {
    isActive = true;
    fatherFormClass = null;
    constructor(inputId, fatherFormClass, state = true) {
        this.fatherFormClass = fatherFormClass;
        this.containerSectionInput = document.getElementById('fileStateAccounts');
        this.input = document.getElementById(inputId);
        this.messageContainer = document.getElementById('messageContainer');
        if (!this.input) console.error('No se pudo inicializar input file => ' + inputId);
        this.init();
        this.handleStateInput(state)
    }

    init() {
        const funcValidate = (file) => {
            return this.validateFile(file)
        }
        const funcMessage = (msg, type) => {
            this.showMessage(msg, type)
        }
        const funcAssignFile = (file) => {
            this.fatherFormClass.assignFile(file);
        }
        this.input.addEventListener('change', function () {
            const file = this.files[0];
            if (file && !funcValidate(file)) {
                funcMessage('Solo se permiten archivos .xlsx', 'error');
                this.value = '';
            } else funcAssignFile(file);

        });
    }

    cleanFiles() {

    }

    handleStateInput(state) {
        if (state) this.input.removeAttribute('disabled');
        else this.input.setAttribute('disabled', false);
        this.handleTooltipByState(state)
        this.isActive = state;
    }

    handleTooltipByState(state) {
        if (!state) {
            this.containerSectionInput.classList.add('customTooltip')
            this.containerSectionInput.classList.add('tooltip-bottom')
            this.containerSectionInput.classList.add('tooltip-warning')
        }
        else {
            this.containerSectionInput.classList.remove('customTooltip')
            this.containerSectionInput.classList.remove('tooltip-bottom')
            this.containerSectionInput.classList.remove('tooltip-warning')
        }
    }

    showMessage(text, type) {
        this.messageContainer.innerHTML = `<div class="message ${type} p-2">${text}</div>`;
        setTimeout(() => {
            this.messageContainer.innerHTML = '';
        }, 5000);
    }

    validateFile(file) {
        if (!file) return false;
        const allowedExtensions = ['.xlsx'];
        const fileName = file.name.toLowerCase();
        const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        const isValidMimeType = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        return isValidExtension && isValidMimeType;
    }
}

class AbstractInput {
    constructor(inputId, validations, fatherFormClass) {
        this.fatherFormClass = fatherFormClass;
        this.inputId = inputId;
        const parts = inputId.split('_');
        if (parts.length <= 1) { console.error('Error de id AbstractInput => ' + inputId); return; }
        this.type = parts[0];
        this.element = document.getElementById(inputId);
        const nextElement = this.element.nextElementSibling;
        if (nextElement)
            this.adviceIcon = (nextElement.classList[0] == 'info-icon') ? nextElement : null;
        if (!this.element) console.error('No se pudo inicializar AbstractInput => ' + inputId);
        this.validations = validations;
        this.bindEvents();
    }

    bindEvents() {
        if (this.type == 'txt') {
            this.element.addEventListener('input', (e) => {
                if (this.validations.typeCharacters == 'number') e.target.value = e.target.value.replace(/\D/g, '');
                if (e.target.value.length > this.validations.maxLength) {
                    e.target.value = e.target.value.slice(0, this.validations.maxLength);
                }
            });

        } else if (this.type == 'cbx') {
            this.element.addEventListener('change', () => {
                this.validateValue()
            });
        }
        this.element.addEventListener('focusout', () => {
            this.validateValue()
        });
    }

    validateValue() {
        let isValid = 0;
        if (this.type == 'cbx' && this.element.checked == false && this.validations.required) isValid++;
        if (this.element.value == '' && this.validations.required) isValid++;
        if (this.validations.requiredLength) {
            const value = (this.element.value) ? (this.element.value) : '';
            if (value.length != this.validations.requiredLength) isValid++;
        }
        if (this.validations.regex)
            if (!this.validations.regex.test(this.element.value)) isValid++;

        this.showAlertInput(isValid == 0)
        return isValid == 0;
    }

    showAlertInput(isValid) {
        if (!isValid) {
            this.element.classList.add('danger');
            this.element.classList.remove('success');
            if (this.adviceIcon) {
                this.adviceIcon.classList.add('danger');
                this.adviceIcon.classList.remove('success');
            }
        } else {
            this.element.classList.add('success');
            this.element.classList.remove('danger');
            if (this.adviceIcon) {
                this.adviceIcon.classList.add('success');
                this.adviceIcon.classList.remove('danger');
            }
        }

    }
}

class JsonResponseHandler {
    static async post(url, data = {}) {
        try {
            const isFormData = data instanceof FormData;
            const response = await fetch(url, {
                method: 'POST',
                headers: isFormData ? {} : {
                    'Content-Type': 'application/json'
                },
                body: isFormData ? data : JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const json = await response.json();

            if (!('success' in json) || !('msg' in json) || !('timestamp' in json)) {
                throw new Error('Respuesta con formato inesperado');
            }

            return (json);
        } catch (error) {
            console.error('Error en la petición:', error);
            return {
                success: false,
                msg: error.message,
                timestamp: new Date().toISOString(),
                data: null
            };
        }
    }

    static async get(url, params = {}) {
        const query = new URLSearchParams(params).toString();
        const urlW = query ? `${url}?${query}` : url;

        try {
            const response = await fetch(urlW, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const json = await response.json();
            if (!('success' in json) || !('msg' in json) || !('timestamp' in json)) {
                throw new Error('Respuesta con formato inesperado');
            }
            return (json);
        } catch (error) {
            console.error('Error en la petición:', error);
            return {
                success: false,
                msg: error.message,
                timestamp: new Date().toISOString(),
                data: null
            };
        }
    }
}

class Loading {
    overlayId = 'overlayLoading';
    txtContainerId = 'txtLoading';
    constructor() {
        this.overlay = document.getElementById(this.overlayId);
        this.txtContainer = document.getElementById(this.txtContainerId);
    }

    open() {
        this.overlay.classList.add('show')
    }

    openFor(time = 1500) {
        this.overlay.classList.add('show');
        setTimeout(() => {
            this.overlay.classList.remove('show')
        }, time)
    }

    close() {
        this.overlay.classList.remove('show')
    }
}

class OverlayBlur {
    id = 'overlayBlurAll';
    constructor() {
        this.element = document.getElementById('overlayBlurAll');
    }

    show() {
        this.element.classList.add('show');
    }
    hide() {
        this.element.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 ~ CURRENT_SESSION:", CURRENT_SESSION);
    LOADING = new Loading();
    OVERLAY_BLUR = new OverlayBlur();
    if (CURRENT_SESSION) {
        VIEW_CONTROLLER.showView('dashboardView');
    } else {
        const session = await SessionController.getVariable();
        console.log("🚀 ~ session:", session)
        if (session) {
            CURRENT_SESSION = await new SessionController(session.user, session.token);
            console.log("🚀 ~ CURRENT_SESSION:", CURRENT_SESSION)
            await VIEW_CONTROLLER.showView('dashboardView');
        } else {
            VIEW_CONTROLLER.showView('mainView');
        }
    }
});