# Firebase Authentication to BigQuery export

An automatic tool for copying and converting Firebase Authentication data to BigQuery.
Inspired by [firestore-to-bigquery-export](https://github.com/Johannes-Berggren/firestore-to-bigquery-export)


- Create a BigQuery dataset with tables corresponding to your Firebase Authentication.
- This package doesn't write anything to Firebase Authentication.

## Installation
> npm i firebase-authentication-to-bigquery-export

```javascript
import bigExport from 'firebase-authentication-to-bigquery-export'

// or

const bigExport = require('firebase-authentication-to-bigquery-export')

// then

const GCPSA = require('./Your-Service-Account-File.json')
bigExport.setBigQueryConfig(GCPSA)
bigExport.setFirebaseConfig(GCPSA)
```

## How to

### API
```javascript
bigExport.setBigQueryConfig(
  serviceAccountFile // JSON
)
```

```javascript
bigExport.setFirebaseConfig(
  serviceAccountFile // JSON
)
```


```javascript
bigExport.createBigQueryTables()
```

```javascript
bigExport.copyToBigQuery(
    verbose // Boolean
)
```

```javascript
bigExport.deleteBigQueryTables()
```


### Examples

```javascript
/* 
Initialize BigQuery dataset named 'authentication' with four firebase authentication.
 */

bigExport.createBigQueryTables()
    .then(res => {
        console.log(res)
    })
    .catch(error => console.error(error))
```

Then, you can transport your data:

```javascript

/* 
Copying and converting from Firebase Authentication data
 */
 
    bigExport.copyToBigQuery()
    .then(res => {
        console.log('Copied ' + res + ' documents to BigQuery.')
    })
    .catch(error => console.error(error))
```

After that, you may want to refresh your data. For the time being, the quick and dirty way is to delete your tables and make new ones:

```javascript
// Deleting the given BigQuery tables.

bigExport.deleteBigQueryTables()
    .then(res => {
        console.log(res)
    })
    .catch(error => console.error(error))
```

Maybe you want to refresh / overwrite a single table?
```javascript
// Overwrites the users BigQuery table with fresh data from Firebase Authentication

bigExport.deleteBigQueryTables()
    .then(() => {
        bigExport.createBigQueryTables()
    })
    .then(promises => {
      return bigExport.copyToBigQuery()
    })
    .then(res => {
      console.log('Copied to BigQuery.')
    })
    .catch(error => console.error(error))
```

## Issues
Please use the [issue tracker](https://github.com/keito5656/firebase-authentication-to-bigquery-export/issues).
