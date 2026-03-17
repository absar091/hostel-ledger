const { validateCoordinates } = require('./backend-server/utils/validation');
console.log('validateCoordinates:', typeof validateCoordinates);
if (typeof validateCoordinates === 'function') {
    console.log('Test call:', validateCoordinates({ lat: 0, lng: 0 }));
} else {
    console.log('FAILED: validateCoordinates is not a function');
}
