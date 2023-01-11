const maxLocationsSaved = 10;
const key = '9e0786cb1b15854a6a708750ddfc20aa';

var metric = false;
var historyData = [];

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
    localStorage.setItem('units','imperial');
});
$('#metric-radio').on('change', function() {
    metric = true;
    localStorage.setItem('units','metric');
});

//When search form is submitted, fetch and display weather data
$('#search-form').on('submit', function(e) {
    //prevent default form submission behavior
    e.preventDefault();
    var textbox = $('#search-input');
    var inp = textbox.val().trim();

    //if nothing typed, fail and return
    if(inp === "") {
        Fail(102);
        return;
    } else {
        textbox.val('');
        textbox.focus();
    }

    //grab weather data based on city name
    GetWeatherByName(inp);
});

//if successful, weather info will be printed to page
function GetWeatherByName (cityName) {
    fetch('http://api.openweathermap.org/geo/1.0/direct?q=' + cityName + '&limit=5&appid=' + key)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        //if city found
        if(data.length > 0) {
            //check if search contains a state name in the results
            var index = 0;
            for(var i = 0; i < data.length; i++) {
                if(data[i].state !== undefined && cityName.toLowerCase().includes(data[i].state.toLowerCase())) {
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
    fetch('http://api.openweathermap.org/data/2.5/forecast?lat=' + lat + '&lon=' + lon + '&appid=' + key + unitParam)
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        //get http code from request, fail if 400+
        var fetchCode = Number(data.cod);
        if(fetchCode >= 400) {
            Fail(fetchCode);
            return;
        }

        //check if this search is already in history
        var alreadySaved = false;
        for(var i = 0; i < historyData.length; i++) {
            if(historyData[i].city === data.city.name && historyData[i].cityParent === state) {
                alreadySaved = true;
                break;
            }
        }

        //if not already saved, add this search to search history
        if(!alreadySaved) {
            historyData.push({
                latitude:lat,
                longitude:lon,
                city:data.city.name,
                cityParent:state
            });
            var numRemoved = 0;
            if(historyData.length > maxLocationsSaved) {
                numRemoved = historyData.length - maxLocationsSaved;
                historyData.splice(0, numRemoved);
            }
            AddHistoryButton(numRemoved);
            localStorage.setItem('history', JSON.stringify(historyData));
        }

        //grab and clear output area
        var mainCard = $('#current-area');
        mainCard.children().remove();
        var forecastArea = $('#forecast-area');
        forecastArea.children().remove();

        for(var i = 0; i < 5; i++) {
            //find same time in the next day by traversing 8 3-hour periods
            //each forecasted day will grab data from 3 hours earlier than today's
            //data because the API does not return data for exactly a full 5 days after
            var dataIndex = ((i+1) * 8) - 1;

            //create card to display day's data
            var forecastCard = $('<div>');
            forecastCard.addClass('forecast-card');

            //create date display for card and add it
            var dateOut = $('<h3>');
            dateOut.text(GetRegionalDate(data.list[dataIndex].dt_txt, data.city.timezone));
            forecastCard.append(dateOut);

            //create icon display for card and add it
            var iconOut = $('<img>');
            iconOut.attr('style','display:block;');
            iconOut.attr('src','http://openweathermap.org/img/wn/' + data.list[dataIndex].weather[0].icon + '.png');
            iconOut.attr('alt',data.list[dataIndex].weather[0].description);
            forecastCard.append(iconOut);

            //grab output paragraphs and add them
            var paras = GetWeatherOutput(data.list[dataIndex]);
            forecastCard.append(paras[0], paras[1], paras[2]);

            //add card to page
            forecastArea.append(forecastCard);
        }


        //initialize page elements for displaying data
        var city = $('<h2>');
        var weatherIcon = $('<img>');

        //set name output based on location
        var nameOutput = data.city.name;
        if(data.city.country === 'US') {
            nameOutput += ", " + state;
        } else {
            nameOutput += ", " + data.city.country;
        }

        //add date after city name
        //adds date from 3 hrs before data, to ensure it is displaying closer to current date and 
        //to line it up with forecast data
        nameOutput += " (" + GetRegionalDate(data.list[0].dt_txt, data.city.timezone - (3*3600)) + ") ";

        //set weather icon and add it to name
        city.text(nameOutput);
        weatherIcon.attr('src','http://openweathermap.org/img/wn/' + data.list[0].weather[0].icon + '.png');
        city.append(weatherIcon);

        //grab output paragraphs
        var paragraphs = GetWeatherOutput(data.list[0]);

        //add elements to page
        mainCard.append(city, paragraphs[0], paragraphs[1], paragraphs[2]);
  });
}

//Called if we fail to get weather data for any reason
//code 101 is the search yielded no results
//code 102 is attempted to search with no input
//otherwise normal http codes, will alert user based on 4xx/5xx if it's a client or server issue
function Fail(code) {
    if(code === 101) {
        alert('City not found.');
    } else if(code === 102) {
        alert('Please enter city name.');
    } else if(code >= 400 && code < 500) {
        alert('Bad fetch request, please try again or nag your local developer.');
    } else if(code >= 500) {
        alert('Server-side error - try again later.');
    } else {
        alert('Something went wrong, and we\'re not sure what.');
    }
}

function Load() {
    var loadedData = JSON.parse(localStorage.getItem('history'));

    //get unit selection from storage, if none exists default to imperial units
    metric = false;
    metric = localStorage.getItem('units') === "metric";

    //set radio buttons in settings window based on selection
    $('#imperial-radio').prop('checked',!metric)
    $('#metric-radio').prop('checked',metric);
    
    //if we have saved data, loop through 
    if(loadedData !== null) {
        historyData = [];
        for(var i = 0; i < loadedData.length; i++) {
            //add each saved search to the array and create a button for it
            historyData.push(loadedData[i]);
            AddHistoryButton(0);
        }
        var lastData = historyData[historyData.length - 1];
        GetWeatherByCoords(lastData.latitude, lastData.longitude, lastData.cityParent);
    }
}

//creates history button in search area for most recently searched city
//removes oldest 'removecount' buttons from page
function AddHistoryButton(removecount) {
    var data = historyData[historyData.length - 1];
    var butt = $('<button>');

    butt.text(data.city);
    butt.addClass('secondary hover historyButton');
    butt.on('click', function() {
        GetWeatherByCoords(data.latitude, data.longitude, data.cityParent);
    });
    //append button to history area if it's the first, otherwise add before other buttons to keep most recent at top
    var histButtons = $('.historyButton');
    if(histButtons.length === 0) {
        $('#search-area').append(butt);
    } else {
        butt.insertBefore('.historyButton:first-of-type');
    }
    //remove oldest buttons according to parameter
    for(var i = histButtons.length - 1; i >= 0; i--) {
        if(removecount > 0) {
            histButtons[i].remove();
            --removecount;
        } else {
            break;
        }
    }
}

//translate date to regional time for destination, and format it - return as string
//offset is seconds from passed date to regional time zone
function GetRegionalDate(dt_text, offset) {
    var dataDate = new Date(dt_text);
    dataDate.setSeconds(dataDate.getSeconds() + offset);
    return (dataDate.getMonth()+1) + "/" + dataDate.getDate() + "/" + dataDate.getFullYear();
}

//returns array of three new paragraph jquery elements that, in order, display
//temperature, wind, and humidity of given openweathermap data list
function GetWeatherOutput(dataList) {
    var temp = $('<p>');
    var wind = $('<p>');
    var hum = $('<p>');

    //set temperature output based on metric/imperial
    var temperature = dataList.main.temp + " °";
    if(metric) {
        temperature += "C";
    } else {
        temperature += "F";
    }
    temp.text("Temp: " + temperature);

    //set wind speed output based on metric/imperial
    var windSpeed = dataList.wind.speed;
    var windUnit = " MPH";
    if(metric) {
        windSpeed *= 3.6;
        windSpeed = Math.round(windSpeed * 100) / 100;
        windUnit = " KPH";
    }
    wind.text("Wind: " + windSpeed + windUnit);

    //set humidity output
    hum.text("Humidity: " + dataList.main.humidity + "%");

    return [temp, wind, hum];
}

//On first page load, load up data
Load();