// Initialize Firebase
var config = {
  apiKey: "AIzaSyCxLSm6lh8lqjTpxxsG1JwagpQhknsF6_M",
  authDomain: "corfu-map-d307a.firebaseapp.com",
  databaseURL: "https://corfu-map-d307a.firebaseio.com",
  projectId: "corfu-map-d307a",
  storageBucket: "corfu-map-d307a.appspot.com",
  messagingSenderId: "746218869599"
};
firebase.initializeApp(config);

const database = firebase.database() // connect to database

const features = database.ref('Features') // Creating parent property

const users = database.ref('Users')  // Creating users parent property

const userLeaderboard = database.ref('Users').orderByChild('distance')

var geoJsonFeatures = new Array();



$.getJSON('../data/2015058_review.geojson.json',function(json){
  database.ref('Features').remove()
  json.features.forEach(element => {
      features.push(element)
      geoJsonFeatures.push(element)

  });
})


// The Google Map.
var map;
var selectedFeature;
var geoJsonOutput;
var downloadLink;
var ratingCounter = 0;
var PropertyValue="unknown";
var cityCircle
var centerForCalc

var latitude = 39.62
var longtitude = 19.92

function init() {
  // Initialise the map.
  
  map = new google.maps.Map(document.getElementById('map-holder'), {
    center: {lat: latitude, lng: longtitude}, // Longtitude & latitude πόλης Κέρκυρας μετά από αναζήτηση στο διαδίκτυο
    zoom: 15, // Το κατά τη γνώμη μου κατάλληλο ζουμ για να φαίνεται το μεγαλύτερο κομμάτι της πόλης.
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: 'satellite'
  });
  
  cityCircle = createCircle(39.62,19.92)
	
  map.data.setControls(['Point', 'LineString', 'Polygon']);
  map.data.setStyle({
    editable: true,
    draggable: true,
    clickable: true
  });

  /* Δημιουργία χαρακτηρηστικών που μπορεί να έχει κάθε μονοπάτι. Τα 2 αυτά χαρακτηρηστικά είναι η βαθμολογία και το χρώμα
  *  
  */
  map.data.setStyle(function(feature){
    if(feature.getProperty('rating') == null){
      color = '#FFCCBC';
      feature.setProperty('rating',PropertyValue);
      feature.setProperty('color',color);
    }
    if(feature.getProperty('color') != PropertyValue){
      color = feature.getProperty('color');
    }

    options = {
      strokeColor : color,
      strokeWeigh : 4
    };

    return options;
  });

  bindDataLayerListeners(map.data);

  // Retrieve HTML elements.
  var mapContainer = document.getElementById('map-holder');
  geoJsonOutput = document.getElementById('geojson-output');
  downloadLink = document.getElementById('download-link');


  /**
   * Παρακάτω ορίζεται ένας click Listener. Είναι μια συνάρτηση που πυροδοτείτε κάθε φορά που ο χρήστης κάνει κλικ οπουδήποτε επάνω 
   * στην ιστοσελίδα. Όταν γίνει το κλικ, παίρνουμε τις συντεταγμένες του σημείου που έγινε το κλικ, υπολογίζουμε το κέντρο και στη συνέχεια
   * διαγράφουμε τα καινούρια μονοπάτια (αυτά που σχεδίασε ο χρήστης) που είναι εκτός της περιφέρειας των 100 μέτρων. Διαγράφουμε τον παλιό
   * κύκλο και σχεδιάζουμε έναν εκ νέου.
   */
  
  google.maps.event.addListener(map, 'click', function( event ){
    latitude = parseFloat(event.latLng.lat().toFixed(2)) // Get only 2 decimals
    longtitude = parseFloat(event.latLng.lng().toFixed(2))
    centerForCalc = new google.maps.LatLng(latitude,longtitude)
    deletePathsOutsideCirlce(centerForCalc)
    deleteCircle(cityCircle)
    cityCircle = createCircle(latitude,longtitude)
  });

  /**
   * Ένας ακόμα click Listener μόνο που αυτός πυροδοτείτε όταν γίνει κλικ πάνω σε ένα μονοπάτι.
   * Με το που γίνει κλικ παίρνουμε τις συντεταγμένες του και υπολογίζουμε την συνολική του απόσταση σε μέτρα.
   * Αυτή η απόσταση προβάλεται στο χρήστη μέσω ενός alert box
   */

  map.data.addListener("click",function(selected){ // kathe fora poy ginetai click panw se path pernaei san epilegmeno kai allazei to ui tou
    selectedFeature = selected.feature;
    var coordinates = selectedFeature.getGeometry().getArray()
    var distance = calculateDistance(coordinates)
    map.data.revertStyle();
    map.data.overrideStyle(selectedFeature,{strokeWeight: 6});
    alert("Path's distance : " + distance + " m.")
    
  });

  /**
   * Εδώ έχουμε ένα right click Listener για κάθε μονοπάτι. Με δεξί κλικ πάνω σε ένα μονοπάτι πυροδοτείται η συνάρτηση για τη βαθμολόγηση του μονοπατιού.
   */

  map.data.addListener("rightclick",function(path){
    pathRating(path);
  })

  map.data.loadGeoJson("../data/2015058_review.geojson.json");

}

google.maps.event.addDomListener(window, 'load', init);

// Refresh different components from other components.
function refreshGeoJsonFromData() {
  map.data.toGeoJson(function(geoJson) {
    geoJsonOutput.value = JSON.stringify(geoJson);
    refreshDownloadLinkFromGeoJson();
  });
}

// Refresh download link.
function refreshDownloadLinkFromGeoJson() {
  downloadLink.href = "data:;base64," + btoa(geoJsonOutput.value);
}

// Apply listeners to refresh the GeoJson display on a given data layer.
function bindDataLayerListeners(dataLayer) {
  dataLayer.addListener('addfeature', refreshGeoJsonFromData);
  dataLayer.addListener('removefeature', refreshGeoJsonFromData);
  dataLayer.addListener('setgeometry', refreshGeoJsonFromData);
  dataLayer.addListener('setproperty', refreshGeoJsonFromData);
}




$(document).ready(function(){
  $('#geojson_button').click(function(){
    hide_show_geojson();
  })
  $('#delete_all_button').click(function(){
    DelAll();
  })
  $('#delete_selected_button').click(function(){
    DelSel();
  })

  var leaderboardData = new Array()
  userLeaderboard.once('value',function(snap){
    snap.forEach(function(item){
      leaderboardData.push(item.val())
    })
    leaderboardData.reverse()
    leaderboardData.forEach(element=>{
      var div = document.createElement('div')
      div.className = 'leader'
      var p = document.createElement('p')
      p.innerHTML = 'User: ' + element.user + ' - Distance: ' + element.distance
      p.style.color = '#fff'
      div.appendChild(p)
      var nav = document.getElementById('mySideNav')
      nav.appendChild(div)
    })
  })
})


// Συνάρτηση που παίρνει το div στο οποίο βρίσκεται το geojson και το κρύβει αν φαίνεται και το αντίστροφο μέσω css

function hide_show_geojson(){
  if($('#geojson-output').css('display').toLowerCase() == 'none'){
    $('#geojson-output').css('display','block');
  }else{
    $('#geojson-output').css('display','none');
  }
}


// Συνάρτηση που διαγράφει όλα τα μονοπάτια.
function DelAll(){
map.data.forEach(function(features){
  map.data.remove(features);
});
}

// Συνάρτηση που διαγράφει μόνο το μονοπάτι στο οποίο έχει κάνει 'κλικ' ο χρήστης
function DelSel(){
	map.data.remove(selectedFeature);
}

/** 
 * Συνάρτηση υπέυθυνη για τη βαθμολογία των μονοπατιών. Την αυξάνει κατά ένα μεχρις ότου να φτάσει 5/5. Σε αυτή την περίπτωση ξαναξεκινάει από το 1. Ταυτόχρονα, μαζί με τη βαθμολογία αλλάζουν και τα χρώματα. Τα χρώματα από την ιστοσελίδα του material design
 * της google. https://material.io/design/color/the-color-system.html
*/
function pathRating(path){
  this.path = path;
  ratingCounter = path.feature.getProperty('rating'); // ksexoristo counter gia kathe ena apo ta paths.
  if(ratingCounter == 5){
    ratingCounter = 1;
  }else{
    ratingCounter++;
  }

  switch(ratingCounter){
    case 1 : color = '#FFCCBC'; break;
    case 2 : color = '#FF7043';break;
    case 3 : color = '#E64A19';break;
    case 4 : color = '#BF360C';break;
    case 5 : color = '#B71C1C';break;
  }

  path.feature.setProperty('rating',ratingCounter);
  path.feature.setProperty('color',color);

}

// Συνάρτηση που υπολογίζει την συνολική απόσταση ενός μονοπατιού μέσω της συνάρτης του google maps geometry api.

function calculateDistance(coors){
  var distance = 0
  for(i=0;i<coors.length-1;i++){
    // console.log(coors[i].lat())
    var meters = google.maps.geometry.spherical.computeDistanceBetween(coors[i],coors[i+1])
    // console.log(meters)
    distance = distance + meters
    distance = Math.ceil(distance)
  }
  return distance
}

// Συνάρτηση που δημιουργεί τον κύκλο εκτός του οποίου ο χρήστης δε μπορεί να δημιουργήσει νέα μονοπάτια
function createCircle(lat,lng){
  var areaCircle = new google.maps.Circle({
    strokeColor: '#000',
    strokeOpacity : .9,
    strokeWidth : 2,
    fillCollor : '#000',
    fillOpacity : .6,
    map : map,
    center: {lat: lat, lng: lng},
    radius : 100
  })
  return areaCircle
}
// Συνάρτηση που διαγράφει τον παραπάνω κύκλο
function deleteCircle(circle){
  circle.setMap(null)
}
// Συνάρτηση που βλέπει ποια μονοπάτια είναι εκτός του κύκλου και τα διαγράφει. Η συνάρτηση καλείται όταν γίνει κλικ οπουδήποτε στο χάρτη
// και πρέπει να δημιουργηθεί εκ νέου ένας κύκλος.
function deletePathsOutsideCirlce(center){
  map.data.forEach(function(feature){
    coordinates = feature.getGeometry().getArray()
    for(i=0;i<coordinates.length;i++){
      if(google.maps.geometry.spherical.computeDistanceBetween(coordinates[i],center) > 100 && feature.getProperty("rating")===PropertyValue){
        map.data.remove(feature)
      }
    } 
  })
}



/**
 * Συνάρτηση που καλείται όταν ο χρήστης επιθυμεί να αποθηκεύσει το σκορ του (άθροισμα αποστάσεων των μονοπατιών που σχεδίασε)
 * Αρχικά γίνεται έλεγχος ότι έχει καταγράψει το όνομα του. Στη συνέχεια ελέγχει για τα μονοπάτια που ήταν εντός των 100 μέτρων
 * και τα προσθέτει σε πίνακα. Αν ο πίνακας είναι άδειος, εμφανίζεται μήνυμα στο χρήστη, αλλίως ξεκινάει ο υπολογισμός του σκορ.
 * Τέλος, ο συνδυασμός του ονόματος με το σκορ έρχονται σε μορφή json και προστίθενται στη firebase .
 */

function logIn(){
  var userName = document.getElementById('userName').value
  if(userName != ''){
    var userPathArray = new Array()
    var indexStart = geoJsonFeatures.length
    geoData = JSON.parse(geoJsonOutput.value)
    geoData = geoData.features
    for(var i=indexStart; i < geoData.length;i++){
      centerForCalc = new google.maps.LatLng(latitude,longtitude)
      deletePathsOutsideCirlce(centerForCalc)
      userPathArray.push(geoData[i])
    }
    if(userPathArray.length>0){
      var coordinatesArray = new Array()
      var distanceArray = new Array()
      for(var j=0; j < userPathArray.length; j++){
        var coordinates = userPathArray[j].geometry.coordinates;
        coordinates.forEach(element => {
          var lat = element[0]
          var lng = element[1]
          coordinatesArray.push(new google.maps.LatLng(lat,lng))
        });
        var distance = calculateDistance(coordinatesArray)
        distanceArray.push(distance)
      }
      var totalDistance = 0;
      distanceArray.forEach(element=>{
        totalDistance += element;
      })

      userJson = {'user':userName,'distance':totalDistance}
      console.log(userJson)
      users.push(userJson)

    }else{
      alert('Try creating a few new paths')
      return
    }
  }else{
    alert('Pleasse enter a user name and try again')
    return
  }
}

/* Open the sidenav */
function openNav() {
  document.getElementById("mySideNav").style.width = "50%";
}

/* Close/hide the sidenav */
function closeNav() {
  document.getElementById("mySideNav").style.width = "0";
}

