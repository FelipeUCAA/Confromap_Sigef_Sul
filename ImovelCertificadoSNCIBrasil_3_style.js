var size = 0;
var placement = 'point';

var style_ImovelCertificadoSNCIBrasil_3 = function(feature, resolution){
    var context = {
        feature: feature,
        variables: {}
    };
    var value = "";
    var labelText = "";
    size = 0;
    var labelFont = "10px, sans-serif";
    var labelFill = "#000000";
    var bufferColor = "";
    var bufferWidth = 0;
    var textAlign = "left";
    var offsetX = 8;
    var offsetY = 3;
    var placement = 'point';

    // Defina a resolução mínima e máxima para exibir a camada
    var minResolution = 0;  // Resolução mínima (menor valor de resolução, maior zoom)
    var maxResolution =100;  // Resolução máxima (maior valor de resolução, menor zoom)

    // Se a resolução estiver fora do intervalo, retorne sem estilo (não renderiza a camada)
    if (resolution < minResolution || resolution > maxResolution) {
        return [];
    }

    if ("" !== null) {
        labelText = String("");
    }

    var style = [ new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(35,35,35,1.0)',
            lineDash: null,
            lineCap: 'butt',
            lineJoin: 'miter',
            width: 0.988
        }),
        fill: new ol.style.Fill({
            color: 'rgba(1,234,255,0.5)'  // Azul claro com 50% de opacidade
        }),
        text: createTextStyle(feature, resolution, labelText, labelFont,
                              labelFill, placement, bufferColor,
                              bufferWidth)
    })];

    return style;
};
