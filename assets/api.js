/******
 * 
 * Usage:
 * 
 * pfAPICall('/v2/animals?type=dog', (data) => {
 *   console.log(data);
 * });
 *
 */


/*********
 * WARNING DANGER WARNING
 * This currently over writes localStorage! When we figure out the schema for saving
 * pet favorites, this will need to be modified to account for the favorites.
 * 
 * This also prints out the response data to the console by default. We might want to
 * remove the console.logs eventually
 */


// How the access token is stored in localStorage
// access_key = {
//    token: "abcdef12345",    
//    expiration: 3600,
//    issued: 1234567,
//    issued_date: "11-22-21"
// }
//
const getAccessKey = () => {
    // If we haven't loaded the access key from localStorage yet, 
    // (usually on page load, or first visit)
    // then try to get it from local storage
    let access_key = {};

    if(localStorage.petProject) {
        // TODO: update local storage to handle both the access key and favorites
        let ls = JSON.parse(localStorage.petProject);
        access_key = ls;
    } else {
        access_key = {token: "", expiration: 0, issued: 0, issued_date: ""};
    }

    return access_key;
}

// Returns a string of the current date in the format of "MM-DD-YYYY"
const getCurrentDate = () => {
    let date = new Date();
    return "" + date.getMonth() + "-" + date.getDate() + "-" + date.getFullYear();
}

// Returns the current timestamp in seconds
const getCurrentTimestamp = () => {
    let date = new Date();
    return date.getSeconds() + (date.getMinutes() * 60) + ((date.getHours() * 60) * 60);
}

// This is an internal function and does not need to be called from any outside script
// returns true if the access token is expired
const pfIsTokenExpired = () => {

    let access_key = getAccessKey();

    // If there is no token, then it's expired
    if(access_key.token === "") {
        return true;
    }

    // The timestamp could match if the user accesses the page at the same time, but on different days
    // so we also need to track the actual date.
    let date = getCurrentDate();
    if(access_key.issued_date !== date) {
        return true;
    }

    // Since petfinder issues the expiration in seconds, check if that many seconds has passed since
    // the access token was issued
    let timestamp = getCurrentTimestamp();
    if(access_key.issued + access_key.expiration > timestamp) {
        return false;
    } else {
        return true;
    }
}

// This is an internal function and does not need to be called from any outside script
const pfAuthenticate = (callback) => {
    // 
    // Pet finder uses oAUTH to authenticate requests.
    // This first request is to give petfiner the client ID and client secret.
    // Petfinder will then return an "access_token" which is then passed to the API calls
    //
    const client_id = "vF2jwT6R9WbdFFjLd0cPFCra1m7vJJHcM1fCV3nxsgtDqXncht";
    const client_secret = "BVYB9yfwFQ6u2yvWlIol7QiEF6xTY2bI3FHlYpF4";

    // Create the oauth request
    let auth = axios.create({
        baseURL: "https://api.petfinder.com/v2/oauth2/token",
        crossorigin: true
    });

    // Send the authentication credentials
    auth.post(`/`, `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`)
    .then((res) => {
        // If the code ends up here, then authentication was successful

        // Store the access key information
        let token = res.data.access_token;
        let access_key = {};
        access_key.token = token;
        access_key.expiration = res.data.expires_in;
        access_key.issued = getCurrentTimestamp();
        access_key.issued_date = getCurrentDate();

        // Put it in local storage
        let storage = JSON.stringify(access_key);
        localStorage.petProject = storage; // TODO: combine with other stored data

        // FINALLY WE CAN MAKE AN API CALL OMG :notlikethis:
        if(callback) {
            callback(); 
        }
    }).catch((res) => {
        alert("Error authenticating with PetFinder. See console for more info.");
        console.log(res);
    });
}

// Call this function to make an API call to Petfinder
// automatically handles the authentication and token
const pfAPICall = (url, callback) => {

    if(pfIsTokenExpired()) {
        // If the token is expired (it usually expires after 3600 seconds)
        // then reauthenticate and make the API call
        pfAuthenticate(() => {
            // If authentication was successfull, then make the original API call
            let access_key = getAccessKey();

            const apiCall = axios.create({
                    baseURL: 'https://api.petfinder.com',
                    headers: {'Authorization': 'Bearer '+ access_key.token}
            });

            // FINALLY WE CAN MAKE AN API CALL OMG :notlikethis:
            apiCall.get(url)
            .then(response => {
                // Ayy we get data
                console.log(response);
                callback(response.data);
            }).catch((res) => {
                alert("Error with API call " + url +"\nSee console for more info.");
                console.log(res);
            });
        });
    } else { // Else if the token is not expired, go ahead and make the API call
        let access_key = getAccessKey();

        const apiCall = axios.create({
            baseURL: 'https://api.petfinder.com',
            headers: {'Authorization': 'Bearer '+ access_key.token}
        });

        apiCall.get(url)
        .then(response => {
            // Ayy we get data
            console.log(response);
            callback(response.data);
        }).catch((res) => {
            alert("Error with API call " + url +"\nSee console for more info.");
            console.log(res);
        });

    }
}

