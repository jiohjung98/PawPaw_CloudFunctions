const functions = require("firebase-functions");

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });""
const axios = require("axios");
const https = require("https");
const {Buffer} = require("buffer");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

exports.getCurrentWeather = functions.https.onCall(async (data, context) => {
  const {lat, lon} = data;
  const apiKey = "81761cea11a6583c64a10a57912dfb98"; // OpenWeatherMap API 키 입력

  // https://api.openweathermap.org/data/2.5/weather?lat=37.3003044128418&lon=126.83513641357422&appid=81761cea11a6583c64a10a57912dfb98
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const weather = response.data.weather[0].id;
    const temp = response.data.main.temp;
    // const humidity = response.data.main.humidity; // 습도
    return {weather, temp};
  } catch (error) {
    console.log(error);
    return null;
  }
});


exports.getCurrentAirQuality = functions.https.onCall(async (data, context) => {
  const getNearestStation = async (data) => {
    const {address} = data;
    try {
      // const key = "i2N0ECQ0aobXMXDIKKIY9e138bcnmhb+aukd5szMhiHmBV"+
      // "k1iPMTXD3/ZYHWYjLmW1cMvmPCyUJiW7Hqic4lVg==";
      const url = `https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/`+
      `getMsrstnList?serviceKey=`+
      `i2N0ECQ0aobXMXDIKKIY9e138bcnmhb%2Baukd5sz`+
      `MhiHmBVk1iPMTXD3%2FZYHWYjLmW1cMvmPCyUJiW7Hqic4lVg%3D%3D`+
      `&returnType=json&numOfRows=1&pageNo=1&addr=${address}`;
      // const url = `https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList`;
      const response = await axios.get(url, {httpsAgent: agent});
      // {
      //   params: {
      //     serviceKey: `${key}`,
      //     returnType: "json",
      //     numOfRows: 1,
      //     pageNo: 1,
      //     addr: address,
      //     ver: "1.0",
      //   },
      // },
      const stationName = response.data.response.body.items[0].stationName;
      return stationName;
    } catch (error) {
      console.log(error);
      return null;
    }
  };
  // const apiKey = "i2N0ECQ0aobXMXDIKKIY9e138bcnmhb+aukd5szMhiHmBV"+
  // "k1iPMTXD3/ZYHWYjLmW1cMvmPCyUJiW7Hqic4lVg==";
  // const apiUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty`; // 대기오염 정보 조회 서비스 API URL
  const stationName = await getNearestStation(data);
  const apiUrll = `https://apis.data.go.kr/B552584/`+
  `ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=`+
  `i2N0ECQ0aobXMXDIKKIY9e138bcnmhb%2Baukd5sz`+
  `MhiHmBVk1iPMTXD3%2FZYHWYjLmW1cMvmPCyUJiW7Hqic4lVg%3D%3D`+
  `&returnType=json&numOfRows=1&pageNo=1`+
  `&stationName=${stationName}&dataTerm=DAILY&ver=1.0`;
  try {
    const response = await axios.get(apiUrll, {httpsAgent: agent});
    // {
    //   params: {
    //     serviceKey: `${apiKey}`,
    //     returnType: "JSON",
    //     numOfRows: 1,
    //     pageNo: 1,
    //     stationName: `${stationName}`,
    //     dataTerm: "DAILY",
    //     ver: "1.0",
    //   },
    // },
    const data = response.data;
    const pm10Value = data.response.body.items[0].pm10Value; // 미세먼지(PM10) 농도
    const pm25Value = data.response.body.items[0].pm25Value; // 초미세먼지(PM2.5) 농도
    return {pm10Value, pm25Value};
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
        "internal", "Failed to get current air quality.");
  }
});

exports.sendImageToServer = functions.https.onCall(async (data, context) => {
  // 외부이미지 arraybuffer형식으로 받아옴
  // Base64 인코딩한 결과 배출
  const getImageAsBase64 = async (imageUrl) => {
    const response = await axios.get(imageUrl, {responseType: "arraybuffer"});
    const buffer = Buffer.from(response.data, "binary");
    return buffer.toString("base64");
  };
  try {
    const {imageUrl} = data;
    // Get the image data as a base64 encoded string
    const imageBase64 = await getImageAsBase64(imageUrl);
    // base64인코딩한 이미지 텍스트를 json으로
    const imageData = {
      image: imageBase64,
    };
    // Send the JSON object to the server via HTTP POST request
    const serverUrl = "http://218.101.195.205:5000/post";
    const response = await axios.post(serverUrl, imageData);
    const breed = response.data;
    // Return the response from the server to the client
    return {breed};
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
        "internal", "Failed to get response from AI server");
  }
});

/*
 base64 인코딩한 이미지 데이터를 파라미터로 받은 경우
 */
exports.sendBase64ToServer = functions.https.onCall(async (data, context) => {
  try {
    // const {imageBase64} = data;
    // // Get the image data as a base64 encoded string
    // const imageData = {
    //   image: imageBase64,
    // };
    // Send the JSON object to the server via HTTP POST request
    const serverUrl = "http://218.101.195.205:5000/post";
    const response = await axios.post(serverUrl, data);
    const breed = response.data;
    // Return the response from the server to the client
    return {breed};
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
        "internal", "Failed to get response from AI server");
  }
});


exports.similarityCheck = functions.https.onCall(async (data, context) => {
  // 쿼리한 이미지 리스트
  const targetImage = data.target_image;
  const queryImages = data.query_images || [];
  // 인터넷이미지 다운 후 base64 인코딩
  // const encodeImageToBase64 = async (imageUrl) => {
  //   try {
  //     const options = {responseType: "arraybuffer"};
  //     const response = await axios.get(imageUrl, options);
  //     const buffer = Buffer.from(response.data, "binary");
  //     const base64Data = buffer.toString("base64");
  //     return base64Data;
  //   } catch (error) {
  //     console.error("Failed to encode image:", error);
  //     return null;
  //   }
  // };
  // const encodeImagesToBase64 = async (imageUrlList) => {
  //   try {
  //     const encodedImageList = await Promise.all(
  //         imageUrlList.map(async (imageUrl) => {
  //           const options = {responseType: "arraybuffer"};
  //           const response = await axios.get(imageUrl, options);
  //           const buffer = Buffer.from(response.data, "binary");
  //           return buffer.toString("base64");
  //         }));
  //     return encodedImageList;
  //   } catch (error) {
  //     console.error(error);
  //     return null;
  //   }
  // };
  const encodeToBase64 = async (data) => {
    try {
      const options = {responseType: "arraybuffer"};
      const response = await axios.get(data, options);
      const buffer = Buffer.from(response.data, "binary");
      const base64Data = buffer.toString("base64");
      return base64Data;
    } catch (error) {
      console.error("Failed to encode data:", error);
      return null;
    }
  };
  // 쿼리한 이미지들을 인코드
  const encodedTarget = await encodeToBase64(targetImage)
      .then((base64Image) => {
        console.log("Base64 encoded image:", base64Image);
        return base64Image;
      })
      .catch((error) => {
        console.error("Failed to encode image:", error);
        throw error;
      });
  const encodedList = await Promise.all(queryImages.map(encodeToBase64))
      .then((encodedImages) => {
        console.log("Base64 encoded images:", encodedImages);
        return encodedImages;
      })
      .catch((error) => {
        console.error("Failed to encode images:", error);
        throw error;
      });
  const sendingData = {
    target_image: encodedTarget,
    query_images: encodedList,
  };
  try {
    const serverUrl = "http://218.101.195.205:5000/sim";
    const response = await axios.post(serverUrl, sendingData);
    const similarArray = response.data;
    // Return the response from the server to the client
    console.log("similarArray result", similarArray);
    return {similarArray};
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
        "internal", "Failed to get response from AI server");
  }
});
