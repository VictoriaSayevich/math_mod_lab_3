class Point {
    constructor(...coordinates) {
        coordinates.forEach(c => {
            for (let axis in c) {
                this[axis.toString()] = c[axis.toString()];
            }
        });
    }
}

class PointList {
    constructor(...points) {
        this.pointList = [];
        return this.pointList;
    }
}

class BezierCurves {
    constructor(step = 0.1, ...points) {
        this.pointList = [];
        this.addPoint(...points);
        this.step = step;
        this.startPoint = this.pointList;
    }

    set step(step) {
        if (step < 0 || step > 1) step = 0.1;
        this._step = step;
    }

    set startPoint(pointList) {
        this._startPoint = {};
        for (let key in pointList[0]) {
            this._startPoint[key.toString()] = 0;
        }
    }

    get step() { return this._step; }
    get startPoint() { return this._startPoint; }

    getBezierBasis(i, t) {
        let fact = Helper.prototype.factorial,
            n = this.pointList.length - 1;
        return fact(n) / (fact(i) * fact(n - i)) * Math.pow(t, i) * Math.pow(1 - t, n - i);
    }

    getBezierCurve() {
        let result = [],
            coeffB = 1;
        for (let t = 0; t <= 1; t += this.step) {
            let newPoint = new Point(this.startPoint);
            for (let i = 0; i < this.pointList.length; i++) {
                coeffB = this.getBezierBasis(i, t);
                for (let axis in this.pointList[i]) {
                    newPoint[axis.toString()] += this.pointList[i][axis.toString()] * coeffB;
                }
            }
            result.push(newPoint);
        }
        return result;
    }

    addPoint(...points) {
        points.forEach(point => {
            this.pointList.push(new Point(point));
        });
    }
}

class Helper {
    factorial(number) {
        return (number <= 1) ? 1 : number * Helper.prototype.factorial(number - 1);
    }
}

class Canvas {
    constructor(width, height, element) {
        this.canvas = element;
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        this.colors = ["green", "red", "blue", "yellow", "grey"];
        this.ctx.fillStyle = "grey";
        this.points = [];
    }

    getPoints() {
        return this.points;
    }

    drawCurve(curve, delay, pause, colorIndex = 0) {
        if (delay === undefined) delay = 10;
        if (pause === undefined) pause = delay;
        let i = 0;

        let delayDraw = () => {
            if (i >= curve.length - 1) return;
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.colors[colorIndex % this.colors.length];
            this.ctx.moveTo(curve[i].x, curve[i].y);
            this.ctx.lineTo(curve[i + 1].x, curve[i + 1].y);
            this.ctx.stroke();

            ++i;

            setTimeout(delayDraw, delay);
        }

        setTimeout(delayDraw, pause);
    }

    draw(curve, delay, pause, colorIndex = 0) {
        if (delay === undefined) delay = 10;
        if (pause === undefined) pause = delay;
        let i = 0;

        let delayDraw = () => {
            if (i >= curve.length - 1) return;
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.colors[colorIndex % this.colors.length];
            this.ctx.moveTo(curve[i][0], curve[i][1]);
            this.ctx.lineTo(curve[i + 1][0], curve[i + 1][1]);
            this.ctx.stroke();
            ++i;
            setTimeout(delayDraw, delay);
        }
        setTimeout(delayDraw, pause);
    }

    event() {
        let bezier = null,
            points = [];
        let buildBezier = () => {
            if (bezier === null) bezier = new BezierCurves(0.01, { x: event.offsetX, y: event.offsetY });
            else bezier.addPoint({ x: event.offsetX, y: event.offsetY });

            this.points.push({ x: event.offsetX, y: event.offsetY });
            points.push({ x: event.offsetX, y: event.offsetY });
            this.drawCurve(bezier.getBezierCurve(), 10, 10, points.length);

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            points.forEach(point => {
                this.ctx.fillRect(point.x, point.y, 8, 8);
            });
        }
        this.canvas.addEventListener('mousedown', buildBezier);
    }

    eventDraw() {

    }
}

function buildBSpline(t, degree, points, knots, weights, result) {
    let i, j, s, l;
    let n = points.length;
    let d = points[0].length;

    if (degree < 1) throw new Error('degree must be at least 1 (linear)');
    if (degree > (n - 1)) throw new Error('degree must be less than or equal to point count - 1');

    if (!weights) {
        weights = [];
        for (i = 0; i < n; i++) {
            weights[i] = 1;
        }
    }

    if (!knots) {
        let knots = [];
        for (i = 0; i < n + degree + 1; i++) {
            knots[i] = i;
        }
    } else {
        if (knots.length !== n + degree + 1) throw new Error('bad knot vector length');
    }

    let domain = [
        degree,
        knots.length - 1 - degree
    ];

    let low = knots[domain[0]];
    let high = knots[domain[1]];
    t = t * (high - low) + low;

    if (t < low || t > high) throw new Error('out of bounds');

    for (s = domain[0]; s < domain[1]; s++) {
        if (t >= knots[s] && t <= knots[s + 1]) {
            break;
        }
    }

    let v = [];
    for (i = 0; i < n; i++) {
        v[i] = [];
        for (j = 0; j < d; j++) {
            v[i][j] = points[i][j] * weights[i];
        }
        v[i][d] = weights[i];
    }

    let alpha;
    for (l = 1; l <= degree + 1; l++) {
        for (i = s; i > s - degree - 1 + l; i--) {
            alpha = (t - knots[i]) / (knots[i + degree + 1 - l] - knots[i]);
            for (j = 0; j < d + 1; j++) {
                v[i][j] = (1 - alpha) * v[i - 1][j] + alpha * v[i][j];
            }
        }
    }

    var result = result || [];
    for (i = 0; i < d; i++) {
        result[i] = v[s][i] / v[s][d];
    }

    return result;
}

let element = document.querySelector('#canvas'),
    width = 300,
    height = 300;

let canvas = new Canvas(width, height, element);
canvas.event();
//B-Spline

let elementSpline = document.querySelector('#canvas_spline'),
    widthSpline = 300,
    heightSpline = 300;

let canvasSpline = new Canvas(widthSpline, heightSpline, elementSpline);

// let pointsSpline = canvas.eventRefreshPoints();

let btnSpline = document.querySelector('#btn_spline');
let knots = [];

class BSpline {
    constructor(pointsArr, order) {
        this.points = [];
        this.setPoints(pointsArr);
        this.order = order;
        this.knotsVector = [];
        this.setKnots();
    }

    setKnots() {
        for (let i = 0; i < this.points.length + this.order + 1; i++) {
            this.knotsVector.push(i);
        }
    }

    setPoints(pointsArr) {
        console.log(pointsArr);
        for (let i = 0; i < pointsArr.length; i++) {
            this.points.push([pointsArr[i].x, pointsArr[i].y]);
        }
    }
}

btnSpline.addEventListener('mousedown', () => {
    let bspline = new BSpline(canvas.getPoints(), 2);
    let bsplineCurve = [];

    for (let t = 0; t < 1; t += 0.01) {
        let point = buildBSpline(t, bspline.order, bspline.points, bspline.knotsVector);
        console.log(bspline.order, bspline.points, bspline.knotsVector);
        bsplineCurve.push(point);
    }
    console.log(bsplineCurve);
    canvasSpline.draw(bsplineCurve, 10, 10, bspline.points.length);
});



// canvasSpline.event();