
import * as admin from 'firebase-admin';
import * as BigQuery from '@google-cloud/bigquery';

let bigQuery: BigQuery.BigQuery | undefined = undefined
let app: admin.app.App | undefined = undefined
const datasetID = "authentication"
const tableName = "authentication"

/**
 * Connecting to the given Firebase project.
 *
 * @param {JSON} serviceAccountFile
 * @public
 */

export function setFirebaseConfig(serviceAccountFile: any) {
    const keys = {
        credential: admin.credential.cert(serviceAccountFile),
    }
    app = admin.initializeApp(keys, "authentication-to-bigquery-export");
}

/**
 * Connecting to the given BigQuery project.
 *
 * @param {JSON} serviceAccountFile
 * @public
 */

export function setBigQueryConfig(serviceAccountFile: any) {
    bigQuery = new BigQuery.BigQuery({
        projectId: serviceAccountFile.project_id,
        credentials: serviceAccountFile
    })
}


/**
 * Creating a BigQuery dataset.
 * Creating the tables with the correct schema if the table doesn't already exist.
 *
 * @public
 */

export async function createBigQueryTables() {
    if (!bigQuery) {
        console.error("please setBigQueryConfig")
        return
    }
    const datasetIsExists = await bigQuery.dataset(datasetID).exists()
    if (!datasetIsExists[0]) {
        await bigQuery.createDataset(datasetID)
    }
    const schema = [
        { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
        { name: 'mail', type: 'string' },
        { name: 'creationTime', type: 'integer' },
        { name: 'lastSignInTime', type: 'integer' },
        { name: 'displayName', type: 'string' },
        { name: 'photoURL', type: 'string' },
        { name: 'phoneNumber', type: 'string' },
        { name: 'tokensValidAfterTime', type: 'integer' },
        { name: 'emailVerified', type: 'bool' },
        { name: 'disabled', type: 'bool' },
    ]
    const options = {
        name: undefined,
        friendlyName: "auth",
        partitioning: undefined,
        view: undefined,
        schema: schema
    }
    return bigQuery.dataset(datasetID).createTable(tableName, options)
}

/**
 * Deletes all the given tables.
 *
 * @public
 */
export async function deleteBigQueryTables() {
    if (!bigQuery) {
        console.error("please setBigQueryConfig")
        return
    }
    const datasetIsExists = await bigQuery.dataset(datasetID).exists()

    if (!datasetIsExists[0]) {
        console.log("Not found Dataset: " + datasetID)
        return
    }

    const tableIsExists = await bigQuery.dataset(datasetID).table(tableName).exists()
    if (!tableIsExists[0]) {
        console.log("Not found table: " + tableName)
        return
    }
    return bigQuery.dataset(datasetID).table(tableName).delete()
}

/**
 * Runs through the given QuerySnapshot and converts and copies it to an array.
 * Inserts the array into a BigQuery table with the given collectionName.
 *
 * @param {boolean} [verbose = false]
 * @returns {Promise<Number>}
 * @public
 */

export async function copyToBigQuery(verbose = false) {
    if (!bigQuery || !app) {
        console.error("please setBigQueryConfig and setFirebaseConfig")
        return
    }

    const results = await app.auth().listUsers(1000)
    let pageToken = results.pageToken
    let users = results.users

    if (pageToken) {
        while (pageToken) {
            const results = await app.auth().listUsers(1000, pageToken)
            pageToken = results.pageToken
            users = users.concat(results.users)
        }
    }
    if (verbose) { console.log("Done: fetch user data") }

    const rows = users.map(x => {
        const creationTime = new Date(x.metadata.creationTime).getTime() / 1000
        const lastSignInTime = new Date(x.metadata.lastSignInTime).getTime() / 1000
        let tokensValidAfterTime: number | null = null
        if (x.tokensValidAfterTime) {
            tokensValidAfterTime = new Date(x.tokensValidAfterTime).getTime() / 1000
        }

        return {
            userId: x.uid,
            mail: x.email ? x.email : null,
            emailVerified: x.emailVerified,
            disabled: x.disabled,
            displayName: x.displayName ? x.displayName : null,
            phoneNumber: x.phoneNumber ? x.phoneNumber : null,
            photoURL: x.photoURL ? x.photoURL : null,
            tokensValidAfterTime: tokensValidAfterTime,
            creationTime: creationTime,
            lastSignInTime: lastSignInTime
        }
    })

    if (verbose) { console.log("inserting data ...") }

    let index2 = 0
    let init: Array<Array<{}>> = [[]]
    const data = rows.reduce((pre, cur) => {

        if (pre[index2].length >= 1000)
            index2++

        if (!pre[index2])
            pre[index2] = []

        pre[index2].push(cur)

        return pre
    }, init)

    const tables = bigQuery.dataset(datasetID).table(tableName)

    return Promise.all(data.map(async x => {
        await new Promise(resolve => setTimeout(resolve, 0.5))
        return tables.insert(x)
    })).then(() => {
        if (verbose) console.log('Successfully copied authentication to BigQuery.')
    })
        .catch(e => {
            let errorMessage = ''

            if (e.errors.length) {
                errorMessage = e.errors.length + ' errors.'
                console.error(e.errors.length + ' errors. Here are the first three:')
                console.error(e.errors[0])
                console.error(e.errors[1])
                console.error(e.errors[2])
            }
            else {
                errorMessage = e
                console.error(e)
            }
            throw new Error(errorMessage)
        })
}