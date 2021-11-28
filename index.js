// var AWS  = require("aws-sdk");
// AWS.config.update({region: 'us-west-2'});

// const ID = 'AKIARX7DSUMECYSGZQXN';
// const SECRET = '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';

// // The name of the bucket that you have created
// const BUCKET_NAME = 'stellar.health.test.steven.wyks';

// AWS.config.getCredentials(function(err) {
//   if (err) console.log(err.stack);
//   // credentials not loaded
//   else {
//     console.log("Access key:", AWS.config.credentials.accessKeyId);
//   }
// });
let data = "";
var AWS = require("aws-sdk");
var fs = require("fs");
const { aws_access_key_id, aws_secret_access_key } = require("./credentials");
const patientsAnonymizedFile = "patientsAnonymized.log";
AWS.config.update({
  accessKeyId: aws_access_key_id,
  secretAccessKey: aws_secret_access_key
});
var s3 = new AWS.S3();

async function getBucket() {
  try {
    const file = await s3
      .getObject({
        Bucket: "stellar.health.test.steven.wyks",
        Key: "patients.log"
      })
      .promise();
    //split returned body of log file by new line into array
    data = await file.Body.toString().split("\n");
    //use map function to return array with anonymized date and month ofr birthdate
    let anonymizedDOBData = await data.map(person => {
      let indexDOB = person.indexOf("DOB='") + 5;
      let indexDateOfBirth = person.indexOf("DATE_OF_BIRTH='") + 15;
      if (indexDOB == 4 && indexDateOfBirth != 14) {
        indexDOB = indexDateOfBirth;
      }
      //find index of "D" in "DOB", add five to get the beginning of date string
      let DOBEndIndex = indexDOB;
      if (indexDOB != -1) {
        let slashCount = 0;
        //because the DD/MM size can vary, we need to get its exact size by counting slashes until we get the slash separating month and year (MM/YY)
        while (slashCount < 2) {
          DOBEndIndex++;
          if (
            person[DOBEndIndex] == "/" ||
            person[DOBEndIndex] == " " ||
            person[DOBEndIndex] == "-"
          ) {
            slashCount++;
          }

          //checking for out of bounds, if the endIndex is greater than 11 (longest date string possible), return the person unchanged as the entry in array
          if (DOBEndIndex - indexDOB > 11) {
            return person;
          }
        }
        if (person[DOBEndIndex] == "-" || person[DOBEndIndex] == " ") {
          return (
            person.substring(0, indexDOB - 1) +
            "X/X/" +
            person.substring(DOBEndIndex + 1, person.length)
          );
        }
        return (
          person.substring(0, indexDOB - 1) +
          "X/X" +
          person.substring(DOBEndIndex, person.length)
        );
      }
    });

    fs.writeFile(patientsAnonymizedFile, anonymizedDOBData.join("\n"), function(
      err
    ) {
      if (err) return console.log(err);
      console.log("Successfuly written to " + patientsAnonymizedFile);
    });
    // console.log(anonymizedDOBData);
    return anonymizedDOBData;
    // });
  } catch (err) {
    console.log(err);
  }
}

const uploadFile = () => {
  fs.readFile(patientsAnonymizedFile, (err, data) => {
    if (err) throw err;
    const params = {
      Bucket: "stellar.health.test.steven.wyks",
      Key: "patientsAnonymized.log",
      Body: JSON.stringify(data, null, 2)
    };
    s3.upload(params, function(err, data) {
      if (err) throw err;
      console.log(`File uploaded successfully at ${data.Location}`);
    });
  });
};

async function app() {
  try {
    await getBucket();
    uploadFile();
  } catch (err) {
    console.log(err);
  }
}

app();
