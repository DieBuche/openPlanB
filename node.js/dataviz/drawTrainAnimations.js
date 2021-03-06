var fs = require('fs');
var Image = require('./imagemodule.js').Image;

var
	width = 1920,
	height = 1080,
	symbolSize = 2,
	
	xCenter = 10.6,
	yCenter = 51.2,
	timeStep = 120,
	yZoom = 120,
	timeAACount = 30,
	timeAALength = 300,
	/*
	xCenter = 13.4,
	yCenter = 52.5,
	timeStep = 10,
	yZoom = 3000,
	timeAACount = 30,
	timeAALength = timeStep/2,
	*/
	xZoom = yZoom*Math.cos(3.141592653589793238462643 * yCenter / 180),
	stopWaiting = 60;
	

console.log('Loading trains');

var trains = JSON.parse(fs.readFileSync('../../../../data/decoded_files/DBFahrplaninfo/DB/schedule.json'));

console.log('Preparing trains');

for (var i = 0; i < trains.length; i++) {
	var train = trains[i];
	train.fint *= 60;
	
	var points = train.points;
	for (var j = 0; j < points.length; j++) {
		var point = points[j];
		var sId = (point.id % 30) + (train.id % 30);
		point.x =  (point.lon - xCenter)*xZoom + width/2;
		point.y = -(point.lat - yCenter)*yZoom + height/2;
		point.t0 = (point.arr % 2048)*60 + sId;
		point.t1 = (point.dep % 2048)*60 + sId;
		
		if (point.t0 == point.t1) {
			point.t0 -= 15;
			point.t1 += 15;
		}
		
		if (point.arr < 0) point.t0 = point.t1 - stopWaiting;
		if (point.dep < 0) point.t1 = point.t0 + stopWaiting;
	}
	train.minT = points[0].t0;
	train.maxT = points[points.length - 1].t1 + train.fint*train.fite;
	
	
	switch (train.type) {
		case 'S':
		case 'Bus':
		case 'STR':
			train.typeId = 1;
		break;
		case 'NWB':
		case 'ag':
		case 'ERB':
		case 'VBG':
		case 'HEX':
		case 'SBB':
		case 'HLB':
		case 'OE':
		case 'MRB':
		case 'EB':
		case 'HzL':
		case 'ME':
		case 'CAN':
		case 'VEC':
		case 'BOB':
		case 'ABR':
		case 'VIA':
		case 'ALX':
		case 'OLA':
		case 'WFB':
		case 'BRB':
			train.typeId = 2;
		break;
		case 'RB':
		case 'RE':
		case 'IRE':
			train.typeId = 3;
		break;
		case 'ICE':
		case 'IC':
			train.typeId = 4;
		break;
		default:
			train.typeId = 0;
	}
}

/*
var trainTypes = {};
for (var i = 0; i < trains.length; i++) {
	key = '_'+trains[i].type;
	if (trainTypes[key] === undefined) {
		trainTypes[key] = {count:0, points:0, type:trains[i].type};
	}
	trainTypes[key].count++;
	trainTypes[key].points += trains[i].points.length;
};
console.log(trainTypes);
process.exit();
*/

console.log('Drawing trains');

var image = new Image(width, height, 3, 4);


var maxFrameNumber = 86400/timeStep;
//maxFrameNumber = 100;

for (var frameNumber = 0; frameNumber < maxFrameNumber; frameNumber++) {
	time = frameNumber*timeStep;
	var filename = '000000' + frameNumber;
	filename = './frames/'+filename.substr(filename.length-4, 4)+'.png';
	
	if (!fs.existsSync(filename)) {
		fs.writeFileSync(filename, '');
		
		console.log('draw frame: '+frameNumber);
		
		image.resetWhite();
		
		/*
		for (var i = 0; i < trains.length; i++) if (trains[i].type == 'Bus' ) drawTrainLine(trains[i], [137/255,       0, 106/255], 'c', symbolSize*1.5);
		for (var i = 0; i < trains.length; i++) if (trains[i].type == 'Tram') drawTrainLine(trains[i], [221/255,       0,       0], 'r', symbolSize*1.5);
		for (var i = 0; i < trains.length; i++) if (trains[i].type == 'U'   ) drawTrainLine(trains[i], [      0,  74/255, 143/255], 'r', symbolSize*2.5);
		for (var i = 0; i < trains.length; i++) if (trains[i].type == 'S'   ) drawTrainLine(trains[i], [      0, 138/255,  68/255], 'c', symbolSize*2.5);
		*/
		
		for (var i = 0; i < trains.length; i++) if (trains[i].typeId == 1) drawTrainLine(trains[i], [0.5, 0.5, 0.5], 'c', symbolSize*0.5);
		for (var i = 0; i < trains.length; i++) if (trains[i].typeId == 2) drawTrainLine(trains[i], [0.5, 0.5, 0.5], 'c', symbolSize*1);
		for (var i = 0; i < trains.length; i++) if (trains[i].typeId == 3) drawTrainLine(trains[i], [0.7,   0,   0], 'c', symbolSize*1);
		for (var i = 0; i < trains.length; i++) if (trains[i].typeId == 4) drawTrainLine(trains[i], [0.7,   0,   0], 'c', symbolSize*2);

		
		console.log('Saving png: '+filename);
		image.savePNG(filename);
	}
}

function drawTrainLine(train, color, symbol, symbolSize) {
	var step = timeAALength/timeAACount;
	var alpha = 1 - Math.pow(0.1, 1/timeAACount);
	
	for (var t = 0; t < timeAACount; t++) {
		//drawTrainLine2(train, color, symbol, symbolSize, time + t*step, alpha)
		drawTrainLine2(train, color, symbol, symbolSize, time - timeAALength + t*step, alpha*t/timeAACount)
	}
}

function drawTrainLine2(train, color, symbol, symbolSize, time, alpha) {
	if ((train.minT < time) && (time < train.maxT)) {
		var points = train.points;
		var minT = points[0].t0;
		var maxT = points[points.length - 1].t1;
		for (var j = 0; j <= train.fite; j++) {
			var tOffset = j*train.fint;
			if ((minT+tOffset < time) && (time < maxT+tOffset)) {
				var index0 = 0;
				for (var k = 1; k < points.length; k++) {
					if (points[k].t0+tOffset < time) {
						index0 = k;
					} else {
						break;
					}  
				}
				var index1 = (index0 < points.length-1) ? index0+1 : index0;
				
				var p0 = points[index0];
				var p1 = points[index1];
				
				var x = p0.x;
				var y = p0.y;
				
				if (p0.t1+tOffset < time) {
					// already departured
					var t = (time - (p0.t1+tOffset))/(p1.t0 - p0.t1);
					x = (p1.x - p0.x)*t + p0.x;
					y = (p1.y - p0.y)*t + p0.y;
				}
				
				var trainAlpha = Math.min(
					time-(points[0].t0+tOffset),
					(points[points.length-1].t1+tOffset - time)
				) / stopWaiting;
				
				if (trainAlpha > 1) trainAlpha = 1;
				if (trainAlpha < 0) console.error('ERROR');
					
				if (symbol == 'c') {
					image.drawFilledCircle(x, y, symbolSize, color, alpha*trainAlpha);
				} else {
					image.drawFilledRectangle(x - symbolSize, y - symbolSize, symbolSize*2, symbolSize*2, color, alpha*trainAlpha);
				}
			}
		}
	}
}
