import "./tkrad.js"

/*
This is the Custom element used by Entando (check the .ftl file inside the bundle dir at src level)
the interface is:
<entando-lapam-metopack modulo=<module key> proxy=true|false (if not defined it is false) ></entando-lapam-metopack>

module key is the value to load the tcl module in the BE side of the system (e.g. "report/bilancioPeriodico", "TkMastrini" ...)
Proxy allows the custom element to use or not its ws proxy implemented as bundle MS, that is needed to validating the jwt token
 */

const ATTRIBUTES = {
    modulo: 'modulo',
    proxy: 'proxy',
};


const permissionResults = {
    UNAUTHORIZED: "UNAUTHORIZED",
    UNAUTHENTICATED: "UNAUTHENTICATED",
    AUTHOK: "AUTHOK"
}


function authRouter(requestedModule, jwtTokenParsed, jwtToken, unauthorizedAction, unauthenticatedAction, authorizedAction, proxy) {
    const checkResult = checkPermissions(requestedModule, jwtTokenParsed, jwtToken, proxy)
    switch (checkResult.result) {
        case permissionResults.UNAUTHORIZED:
            unauthorizedAction()
            break
        case permissionResults.UNAUTHENTICATED:
            unauthenticatedAction()
            break
        default:
            authorizedAction(checkResult.runner)
    }
}


function buildRunner(requestedModule, metopackConfig, jwtToken, proxy) {
    const connectionTokens = metopackConfig.connection.split(":")
    var moduloJwtToken = ""
    var pathToken = ""
    if (proxy !== "false") {
        moduloJwtToken = "|" + jwtToken
        pathToken = "/lapam-ws"
        connectionTokens[0] = window.location.hostname
        connectionTokens[1] = "80"
    }

    return {
        host: connectionTokens[0],
        port: connectionTokens[1],
        path: pathToken,
        utente: metopackConfig.utente,
        prog: metopackConfig.prog,
        titolo: "Metopack",
        modulo: requestedModule + moduloJwtToken
    }
}

function checkPermissions(requestedModule, jwtTokenParsed, jwtToken, proxy) {
    if (!jwtTokenParsed) return {result: permissionResults.UNAUTHENTICATED}
    try {
        var allowedModules = jwtTokenParsed.lapam.metopackcloud.modules
    } catch (e) {
        console.error(e)
        return {result: permissionResults.UNAUTHORIZED}
    }

    if (!allowedModules.includes(requestedModule)) {
        return {result: permissionResults.UNAUTHORIZED}
    }

    try {
        var runner = buildRunner(requestedModule, jwtTokenParsed.lapam.metopackcloud, jwtToken, proxy)
    } catch (e) {
        console.error(e)
    }

    return {result: permissionResults.AUTHOK, runner}

}


class EntandoLapamMetopack extends HTMLElement {

    static get observedAttributes() {
        return Object.values(ATTRIBUTES);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!Object.values(ATTRIBUTES).includes(name)) {
            throw new Error(`Untracked changed attribute: ${name}`);
        }
        if (this.mountPoint && newValue !== oldValue) {
            this.authRouting();
        }
    }

    connectedCallback() {
        //listen to keycloak events to be sure we have the token, before rendering the element body
        window.addEventListener('keycloak', (e) => {
            if (e.detail.eventType === "onReady") {
                this.authRouting()
            }
        })

    }

    authRouting() {
        const keycloak = window.entando.keycloak

        const requestedModule = this.getAttribute(ATTRIBUTES.modulo)
        const proxy = this.getAttribute(ATTRIBUTES.proxy)
        const unauthorizedAction = () => {
            console.log("unauthorizedAction")
            const text = document.createElement("div");
            text.innerHTML = "Non sei autorizzato"
            this.appendChild(text)
        }
        const unauthenticatedAction = () => {
            console.log("unauthenticatedAction")
            keycloak.login()
        }
        const authorizedAction = (runner) => {
            this.render(runner)
        }

        authRouter(requestedModule, keycloak.tokenParsed, proxy ? keycloak.token : undefined, unauthorizedAction, unauthenticatedAction, authorizedAction, proxy)
    }

    render(runner) {
        const ele = document.createElement("tkrad-digital")
        const loader = document.createElement("tkrad-progress")
        loader.buildObject()
        ele.appendChild(loader)
        ele.setModule(runner, (type, event) => {
            if (type == "OPEN") {
                loader.remove()
            } else if (type == "START") {
                ele.innerHTML = "Connessione non realizzabile"
            } else if (type == "ERROR") {
                ele.innerHTML = "Connessione momentaneamente non disponibile"
            } else if (type == "CLOSE") {
                ele.innerHTML = "Connessione terminata"
            }
        })

        this.appendChild(ele)

    }
}

customElements.get('entando-lapam-metopack') || customElements.define("entando-lapam-metopack", EntandoLapamMetopack)
