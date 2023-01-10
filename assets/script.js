const maxLocationsSaved = 10;

var metric = false;

//Settings button displays/hides the settings window
$('#settings-icon').on('click', function() {
    var menu = $('#settings-menu');
    if(menu.hasClass('hidden-menu')) {
        menu.removeClass('hidden-menu');
        menu.addClass('displayed-menu');    
    } else {
        menu.removeClass('displayed-menu');
        menu.addClass('hidden-menu');
    }
});

//Radio buttons in settings window set unit selection between metric and imperial
$('#imperial-radio').on('change', function() {
    metric = false;
});
$('#metric-radio').on('change', function() {
    metric = true;
});

//When search form is submitted, fetch and display weather data
$('#search-form').on('submit', function(e) {
    //prevent default form submission behavior
    e.preventDefault();

    //grab weather data based on city name
    var cityName = $('#search-input').val();
    GetWeatherByName(cityName);
});

//if successful, weather info will be printed to page
function GetWeatherByName (cityName) {
    fetch('http://api.openweathermap.org/geo/1.0/direct?q=' + cityName + '&limit=5&appid=9e0786cb1b15854a6a708750ddfc20aa')
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        //if city found
        if(data.length > 0) {
            //check if search contains a state name in the results
            var index = 0;
            for(var i = 0; i < data.length; i++) {
                if($('#search-input').val().toLowerCase().includes(data[i].state.toLowerCase())) {
                    index = i;
                    break;
                }
            }

            //grab weather data based on coordinates
            GetWeatherByCoords(data[index].lat, data[index].lon, data[index].state);
        } else {
            //No result found, we've failed
            Fail(101);
        }
    });
}

//Grabs weather data and adds to page
function GetWeatherByCoords(lat, lon, state) {
    //set whether to get temps in celsius or fahrenheit
    var unitParam = '&units=';
    if(metric) {
        unitParam += 'metric';
    } else {
        unitParam += 'imperial';
    }

    //fetch data from api
    fetch('http://api.openweathermap.org/data/2.5/forecast?lat=' + lat + '&lon=' + lon + '&appid=9e0786cb1b15854a6a708750ddfc20aa' + unitParam)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        //get http code from request, fail if 400+
        var fetchCode = Number(data.cod);
        if(fetchCode >= 400) {
            Fail(fetchCode);
        }

        //initialize page elements for displaying data
        var mainCard = $('#current-area');
        var city = $('<h2>');
        var temp = $('<p>');
        var wind = $('<p>');
        var hum = $('<p>');

        //set name output based on location
        var nameOutput = data.city.name;
        if(data.city.country === 'US') {
            nameOutput += ", " + state;
        } else {
            nameOutput += ", " + data.city.country;
        }

        //set temperature output based on metric/imperial
        var temperature = data.list[0].main.temp + " °";
        if(metric) {
            temperature += "C";
        } else {
            temperature += "F";
        }
        //set wind speed output based on metric/imperial
        var windSpeed = data.list[0].wind.speed;
        var windUnit = " MPH";
        if(metric) {
            windSpeed *= 3.6;
            windSpeed = Math.round(windSpeed * 100) / 100;
            windUnit = " KPH";
        }

        //set data into new page elements
        city.text(nameOutput);
        temp.text("Temp: " + temperature);
        wind.text("Wind: " + windSpeed + windUnit);
        hum.text("Humidity: " + data.list[0].main.humidity + "%");

        //add elements to page
        mainCard.append(city, temp, wind, hum);
  });
}

//Called if we fail to get weather data for any reason
//code 101 is the search yielded no results
//otherwise normal http codes, will alert user based on 4xx/5xx if it's a client or server issue
function Fail(code) {
    if(code === 101) {
        alert('City not found.');
    } else if(code >= 400 && code < 500) {
        alert('Bad fetch request, please try again or nag your local developer.');
    } else if(code >= 500) {
        alert('Server-side error - try again later.');
    } else {
        alert('Something went wrong, and we\'re not sure what.');
    }
}