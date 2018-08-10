"use strict";

const bodyParser = require("body-parser");
const axios = require('axios');


var Alexa = require("alexa-sdk");

var APP_ID = undefined;

const counter = 0;

const states = {
    START: "_START",
    QUIZ: "_QUIZ"
};

const handlers = {
    "LaunchRequest": function() {
        this.handler.state = states.START;
        this.emitWithState("Start");
     },
    "QuizIntent": function() {
        this.handler.state = states.QUIZ;
        this.emitWithState("Quiz");
    },
    "AnswerIntent": function() {
        this.handler.state = states.START;
        this.emitWithState("AnswerIntent");
    },
    "AMAZON.HelpIntent": function() {
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        this.handler.state = states.START;
        this.emitWithState("Start");
    }
}

const START_GAME_MESSAGE = "Hey party people! When you're ready to play, say start lyrics quiz. ";
const HELP_MESSAGE = "Please say . start lyrics quiz to begin. ";
const GAME_END_MESSAGE = "Goodbye";
const GAME_LOSE_MESSAGE = " You are really shit at this game. Don't bother playing again! Goodbye ";
const GAME_WIN_MESSAGE = "Oh my god! You are actually not as bad at this game as I thought. Laters ";
const START_QUIZ_MESSAGE = "I will speak the lyrics of 5 songs, and after each song, I will ask you to name the artist. ";

function getSarcyComment (type) {
    let speechCon = "";
    if (type) return "<say-as interpret-as='interjection'>" + sarcyCommentsCorrect[getRandomSong(0, sarcyCommentsCorrect.length-1)] + "! </say-as><break strength='strong'/>";
    else return "<say-as interpret-as='interjection'>" + sarcyCommentsIncorrect[getRandomSong(0, sarcyCommentsIncorrect.length-1)] + " </say-as><break strength='strong'/>";
}

const sarcyCommentsCorrect = ["Well done!. ", "Smarty pants. ", "Check you out. ", "Correctamunndo. ", "You are a wise and noble human being. ", "Wrong! . Just kidding . You're right. "];
const sarcyCommentsIncorrect = ["As if!. ", "Seriously?. ", "Now you are not even trying. ", "You might as well give up now", "I don't know why I bother! "];

const startHandlers = Alexa.CreateStateHandler(states.START, {
    "Start": function() {
        this.response.speak(START_GAME_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "QuizIntent": function() {
        this.handler.state = states.QUIZ;
        this.emitWithState("Quiz");
    },
    "AMAZON.StopIntent": function() {
        this.response.speak(GAME_END_MESSAGE);
        this.emit(":responseReady");
    },
    "AMAZON.CancelIntent": function() {
        this.response.speak(GAME_END_MESSAGE);
        this.emit(":responseReady");
    },
    "AMAZON.HelpIntent": function() {
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        this.emitWithState("Start");
    }
})

const quizHandlers = Alexa.CreateStateHandler(states.QUIZ,{
    "Quiz": function() {
        this.attributes["response"] = "";
        this.attributes["counter"] = 0;
        this.attributes["quizscore"] = 0;
       // this.attributes["lyrics"] = fetchsongAPI();
        this.emitWithState("AskQuestion");
    },

    "AskQuestion": function() {
        if (this.attributes["counter"] == 0) {
            this.attributes["response"] = START_QUIZ_MESSAGE + " ";
        }
        // gets random object(from data)
        // let random = getRandomSong(0, data.length-1);
        // let song = data[random];
        let songObj = songRandomiser(songs);
        fetchsongAPI(songObj.title, songObj.singer).then((data) => {
            // let propertyArray = Object.getOwnPropertyNames(data.song);
            let property = "artist";
    
           this.attributes["quizsong"] = data;
           this.attributes["quizproperty"] = property;
           this.attributes["counter"]++;
    
           // property is the key from data
           let songQuestion = getSong(this.attributes["counter"], property, data.song, data.lyrics);
           let songGuess = this.attributes["response"] + songQuestion;
    
           this.emit(":ask", songGuess, songQuestion);

        });

    },
    "AnswerIntent": function() {
        let response = "";
        let speechOutput = "";
        let data = this.attributes["quizsong"];
        let property = this.attributes["quizproperty"]
    

        let correct = compareSlots(this.event.request.intent.slots, data[property]);
        
        if (correct) {
            response = getSarcyComment(true);
            this.attributes["quizscore"]++;
        }
        else{
            response = getSarcyComment(false);
        }

        response += getAnswer(property, data);

        if (this.attributes["counter"] < 5) {
            response += getCurrentScore(this.attributes["quizscore"], this.attributes["counter"]);
            this.attributes["response"] = response;
            this.emitWithState("AskQuestion");
        }
        // else {
        //     response += getFinalScore(this.attributes["quizscore"], this.attributes["counter"]);
        //     speechOutput = response + " " + GAME_END_MESSAGE;

        //     this.response.speak(speechOutput);
        //     this.emit(":responseReady");
        // }
        else {
            response += getFinalScore(this.attributes["quizscore"], this.attributes["counter"]);
            
            if (this.attributes["quizscore"] <= 3) {
                speechOutput = response + " " + GAME_LOSE_MESSAGE;
            }
            else {
                speechOutput = response + " " + GAME_WIN_MESSAGE;
            }

            this.response.speak(speechOutput);
            this.emit(":responseReady");
        }
    },
    "AMAZON.RepeatIntent": function() {
        let song = getSong(this.attributes["counter"], this.attributes["quizproperty"], this.attributes["quizsong"]);
        this.response.speak(song).listen(song);
        this.emit(":responseReady");
    },
    "AMAZON.StartOverIntent": function() {
        this.emitWithState("Quiz");
    },
    "AMAZON.StopIntent": function() {
        this.response.speak(GAME_END_MESSAGE);
        this.emit(":responseReady");
    },
    "AMAZON.CancelIntent": function() {
        this.response.speak(GAME_END_MESSAGE);
        this.emit(":responseReady");
    },
    "AMAZON.HelpIntent": function() {
        this.response.speak(HELP_MESSAGE).listen(HELP_MESSAGE);
        this.emit(":responseReady");
    },
    "Unhandled": function() {
        this.emitWithState("AnswerIntent");
    }
}) 

// gets object in data array
function fetchSong(slots) {
    // get keys from data
    let propertyArray = Object.getOwnPropertyNames(data[0]);
    let value;
    for (let slot in slots)
    {
        if (slots[slot].value !== undefined)
        {
            value = slots[slot].value;
            for (let property in propertyArray)
            {
                let song = data.filter(x => x[propertyArray[property]].toString().toLowerCase() === slots[slot].value.toString().toLowerCase());
                if (song.length > 0)
                {
                    return song[0];
                }
            }
        }
    }
    return value;
}

// function defining song that alexa uses for question
function getSong(counter, property, song, lyrics) {
    return "Here is song number " + counter + ". Name the artist. The song is coming in 3. 2. 1. " + lyrics;    
}

// returns the answer after allocated time.
function getAnswer(property, song) {
return ". The song was " + song.song + " bye " + song[property];
}

function getRandomSong (startNum, endNum) {
    return Math.floor(Math.random() * (endNum - startNum + 1) + startNum);
}

function compareSlots(slots, value) {
    for (let slot in slots) {
        if (slots[slot].value !== undefined) {
            if (slots[slot].value.toString().toLowerCase() === value.toString().toLowerCase()) {
                return true;
            }
        }
    }
    return false;
}

function getCurrentScore (score, counter) {
    //return ". Your current score is " + score + " out of " + counter + ". ";
    return ". Your current score is " + score + " out of 5" + ". ";
}

function getFinalScore (score, counter) {
    // return ". Bloody hell, you scored " + score + " out of " + counter + ". ";
    return ". Bloody hell, you scored " + score + " out of 5" + ". ";
}

exports.handler = (event, context, callback) => {
    const alexa = Alexa.handler(event, context,callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers, startHandlers, quizHandlers);
    alexa.execute();
};

// randomly gets artist and song for fetch request
function songRandomiser(arr) {
    let random = Math.floor(Math.random() * arr.length);
    let songObj = {
        title: arr[random].song,
        singer: arr[random].artist
    }
    return songObj;
    
}

function fetchsongAPI(title, singer) {
    return axios.get(`https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?q_track=${title}&q_artist=${singer}&apikey=c6af8e74da168c2f810eab97f6a8f603`)
    .then(response => {
        let lyrics = response.data.message.body.lyrics.lyrics_body;
        //take first 3 new lines 
        let lyricsArray = lyrics.split("\n");
        let lyricsOutput = lyricsArray.slice(0, 3).join(". ")+".";
        let data = {
            song: title,
            artist: singer,
            lyrics: lyricsOutput
        };
        return data;
    })
}

const songs = [
{ song: 'Wannabe',
artist: 'Spice Girls' },
{ song: 'Mr. Brightside',
artist: 'The Killers' },
{ song: 'Bohemian Rhapsody',
artist: 'Queen' },
{ song: 'Video Killed The Radio Star',
artist: 'The Buggles' },
{ song: 'Oops!...I Did It Again',
artist: 'Britney Spears' },
{ song: 'Come On Eileen',
artist: 'Dexys Midnight Runners' },
{ song: 'P.I.M.P.',
artist: '50 Cent' },
{ song: 'Brown Eyed Girl',
artist: 'Van Morrison' },
{ song: '(Everything I Do) I Do It For You',
artist: 'Bryan Adams' },
{ song: 'School\'s Out',
artist: 'Alice Cooper' },
{ song: 'Thriller',
artist: 'Michael Jackson' },
{ song: 'Crazy In Love',
artist: 'Beyoncé' },
{ song: 'I Wanna Dance with Somebody (Who Loves Me)',
artist: 'Whitney Houston' },
{ song: 'I Want You Back',
artist: 'The Jackson 5' },
{ song: 'Don\'t You Want Me',
artist: 'The Human League' },
{ song: 'Hey Jude',
artist: 'The Beatles' },
{ song: 'Wonderwall',
artist: 'Oasis' },
{ song: 'Believe',
artist: 'Cher' },
{ song: 'Livin\' On A Prayer',
artist: 'Bon Jovi' },
{ song: 'Sweet Home Alabama',
artist: 'Lynyrd Skynyrd' },
{ song: 'I\'m Gonna Be (500 Miles)',
artist: 'The Proclaimers' },
{ song: 'Suspicious Minds',
artist: 'Elvis Presley' },
{ song: 'Hot Stuff',
artist: 'Donna Summer' },
{ song: 'My Heart Will Go On',
artist: 'Celine Dion' },
{ song: 'Milkshake',
artist: 'Kelis' },
{ song: 'Girls Just Wanna Have Fun',
artist: 'Cyndi Lauper' },
{ song: 'Uptown Funk',
artist: 'Mark Ronson' },
{ song: 'Stayin\' Alive',
artist: 'Bee Gees' },
{ song: 'Rule the World',
artist: 'Take That' },
{ song: 'Baby Love',
artist: 'The Supremes' },
{ song: 'Livin\' la Vida Loca',
artist: 'Ricky Martin' },
{ song: 'Hips Don\'t Lie',
artist: 'Shakira' },
{ song: 'Gold Digger',
artist: 'Kanye West' },
{ song: 'Step Back In Time',
artist: 'Kylie Minogue' },
{ song: 'Good Luck',
artist: 'Basement Jaxx' },
{ song: 'MMMBop',
artist: 'Hanson' },
{ song: 'U Can\'t Touch This',
artist: 'MC Hammer' },
{ song: 'Subterranean Homesick Blues',
artist: 'Bob Dylan' },
{ song: 'Saturday Night',
artist: 'Whigfield' },
{ song: 'Agadoo',
artist: 'Black Lace' },
{ song: 'Ghostbusters - From "Ghostbusters"',
artist: 'Ray Parker, Jr.' },
{ song: 'The Locomotion',
artist: 'Little Eva' },
{ song: 'Standing in the Way of Control',
artist: 'Gossip' },
{ song: 'Firestarter',
artist: 'The Prodigy' },
{ song: 'Song 2',
artist: 'Blur' },
{ song: 'Gettin\' Jiggy Wit It',
artist: 'Will Smith' },
{ song: 'Like A Prayer',
artist: 'Madonna' },
{ song: 'Jump Around',
artist: 'House Of Pain' },
{ song: 'Tainted Love',
artist: 'Soft Cell' },
{ song: 'New York, New York',
artist: 'Frank Sinatra' },
{ song: 'Jailhouse Rock',
artist: 'Elvis Presley' },
{ song: 'Don\'t Believe The Hype',
artist: 'Public Enemy' },
{ song: 'Fight For Your Right',
artist: 'Beastie Boys' },
{ song: 'Halo',
artist: 'Beyonce' }, 
{ song: 'Space Oddity',
artist: 'David Bowie' },
{ song: 'Shake It Off',
artist: 'Taylor Swift' },
{ song: 'Rolling In The Deep',
artist: 'Adele' },
{ song: 'Fame',
artist: 'Irene Carr' },
{ song: 'Smells Like Teen Spirit',
artist: 'Nirvana' },
{ song: 'Walk This Way',
artist: 'Aerosmith and Run-D.M.C'}
];