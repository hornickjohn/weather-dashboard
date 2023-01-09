$('#search-form').on('submit', function(e) {
    //prevent default form submission behavior
    e.preventDefault();

    //grab weather data based on city name, and check if data found
    var cityName = $('#search-input').val();
    var success = GetWeatherByName(cityName);
});

//returns whether a success or not - if it is, weather info will be printed to page
function GetWeatherByName (cityName) {
    fetch('http://api.openweathermap.org/geo/1.0/direct?q=' + cityName + '&limit=1&appid=9e0786cb1b15854a6a708750ddfc20aa')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        //if city found
        if(data.length > 0) {
            //grab weather data based on coordinates
            return GetWeatherByCoords(data[0].lat, data[0].lon);
        } else {
            //No result found, return a failure
            return false;
        }
    });
}

function GetWeatherByCoords(lat, lon) {
    fetch('http://api.openweathermap.org/data/2.5/forecast?lat=' + lat + '&lon=' + lon + '&appid=9e0786cb1b15854a6a708750ddfc20aa')
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    console.log(data);
  });
}