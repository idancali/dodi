const path = require('path')
const Cassi = require('cassi')
const { Archive } = require('rara')
const fs = require('fs-extra')

class _ {
    constructor(index, props) {
        this._index = index
        this._props = Object.assign({}, props)
        this._path = (index && index.dir && this.props.id) ? path.resolve(this.index.path, this.props.id) : null

    }

    get index() {
        return this._index
    }

    get props() {
        return this._props
    }

    get path () {
        return this._path
    }

    get id() {
        return this.props.id
    }

    get exists() {
        return this.path && fs.existsSync(path.resolve(this.path))
    }

    get vault() {
        return this._vault
    }

    findArchive(args) {
        const archive = new Archive({ dir: this.path, id: args.id, version: args.version  })

        return archive.initialize()
                      .then(() => {
                        if (!archive.exists) {
                            // It has not be installed yet
                            return Promise.reject(new Error(_.ERRORS.CANNOT_LOAD('the archive does not exist')))
                        }                
                        // Looks like we got it, let's send it back and load if necessary
                        return args.load ? archive.load() : Promise.resolve(archive)
                      })

    }

    installArchive(args) {
        const archive = new Archive({ dir: this.path, id: args.id, version: args.version  })

        return new Promise((resolve, reject) => {
            // First check if it's cached
            this.findArchive({ dir: this.path, id: args.id, version: args.version })
                .then((archive) => resolve(archive))                

                // If not, then download it
                .catch((e) => archive.download().then(() => resolve(archive)))
        })

        // And let's also load it if necessary
        .then((archive) => args.load ? archive.load() : archive)
    }

    initialize () {
        if (!this.path) {
            // First make sure the path exists
            return Promise.reject(new Error(_.ERRORS.CANNOT_INIT('no location was specified')))
        }
        
        // Create it first if necessary
        this.exists || fs.mkdirsSync(this.path)

        // Let's look up the vault
        this._vault = new Cassi.Vault({ name: _.VAULT_NAME, root: path.resolve(this.path) })
        
        // Create the vault if necessary
        return this.vault.exists ? this.vault.load() : this.vault.create(_.VAULT_DEFAULT_PASSWORD) 
    }
}

_.ERRORS = {
    CANNOT_INIT: (reason) => reason ? `Cannot initialize section because ${reason}` : `Cannot initialize section`,
    CANNOT_LOAD: (reason) => reason ? `Cannot load section because ${reason}` : `Cannot load section`
}

_.VAULT_NAME = '.vault'
_.VAULT_DEFAULT_PASSWORD = '-TEMPORARY-'

module.exports = _