const path = require("path");
const { generateLogger } = require(path.resolve("src/util/logging"));

let LOG_LOCATION = "logs/app"
let LOG_LEVEL = 10
let LOG_FILE_LEVEL = 10
let LOG_FILE_ROTATE = "30d"

class TagValidator {
    constructor(schema, job, tagsToValidate) {
        this.log = generateLogger(job.data._JOB_IID, path.resolve(LOG_LOCATION), LOG_LEVEL, LOG_FILE_LEVEL, LOG_FILE_ROTATE)
        
        this.VERBOSE = true;
        this.validatedTags = {};
        this.setSchema({...this.defaultSchema(), ...schema});
        this.initializeTags(tagsToValidate ?? {});
    }
    
    overwriteSchema(newSchema) {
        this.log.warn('OVERWRITING SCHEMA!');
        this.log.warn(`OLD : ${JSON.stringify(this.schema)}`);
        this.log.warn(`NEW : ${JSON.stringify(newSchema)}`);
        if (this.VERBOSE) {this.log.warn(`OLD VALID TAGS : ${(JSON.stringify(this.validatedTags))}`)};
        this.setSchema({...this.defaultSchema(), ...newSchema});
        this.initializeTags(this.validatedTags);
        if (this.VERBOSE) {this.log.warn(`NEW VALID TAGS : ${JSON.stringify(this.validatedTags)}`)};
    }

    overwriteTag(tag, value) {
        // if (!this.schema.hasOwnProperty(tag)) {
        //     throw new Error(`[overwriteTag] Tag ${tag} is not defined in the schema.`);
        // }
        
        // const expectedType = this.schema[tag].type;
        // if (typeof value !== expectedType) {
        //     throw new Error(`[overwriteTag] Invalid type for tag ${tag}. Expected ${expectedType}, got ${typeof value}.`);
        // }

        // // Overwrite the tag value
        // this.validatedTags[tag] = value;
        
        // // Reinitialize tags to ensure property definition
        // this.initializeTags(this.validatedTags, true);

        // this.log.info(`[overwriteTag] Tag ${tag} has been overwritten to ${value}.`);
        this.log.warn(`OVERWRITING TAG "${tag}"!`)
        this.log.warn(`CURRENT VALUE : ${this.validatedTags[tag]} (${typeof(this.validatedTags[tag])})`)
        this.log.warn(`NEW VALUE     : ${value} (${typeof(value)})`)
        this.validatedTags[tag] = value;
        this.initializeTags(this.validatedTags)
    }

    defaultSchema() {
        return {
            DRY: {type: 'boolean', default: true},
            VERBOSE: {type: 'boolean', default: false},
        }
    }

    setSchema(schema) {
        this.schema = schema;
    }


    initializeTags(tags) {

        if (!tags) {
            this.log.info('[initializeTags] Não foi repassado nenhuma tag')
            return;
        }

        for (const [key, schema] of Object.entries(this.schema)) {
            this.log.unit(`[initializeTags] Key : ${key} | Schema: ${JSON.stringify(schema)}`)

            const value = tags[key];
            if (value === undefined) {
                this.validatedTags[key] = schema.default;
            } else if (typeof value !== schema.type) {
                throw new Error(`[initializeTags] Invalid type for tag ${key}. Expected ${schema.type}, got ${typeof value}.`);
            } else {
                this.validatedTags[key] = value;
            }
        }
        
        // Define properties dynamically
        for (const [key, value] of Object.entries(this.validatedTags)) {
            // Verifica se a propriedade já está definida
            if (!Object.prototype.hasOwnProperty.call(this, key)) {
                Object.defineProperty(this, key, {
                    get: function() {
                        return this.validatedTags[key];
                    }
                });
            }
        }
    }

    get(tag) {
        return this.validatedTags[tag];
    }

}

module.exports = {
    TagValidator
}
