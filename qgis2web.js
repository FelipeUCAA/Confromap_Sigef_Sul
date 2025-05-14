
var map = new ol.Map({
    target: 'map',
    renderer: 'canvas',
    layers: layersList,
    view: new ol.View({
         maxZoom: 28, minZoom: 1
    })
});

// Função para adicionar um marcador no mapa
function addMarker(longitude, latitude) {
    // Converte as coordenadas para EPSG:3857
    const coords = ol.proj.fromLonLat([longitude, latitude]);

    // Cria uma feature (elemento) de ponto
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(coords)
    });

    // Define o estilo do marcador (um ícone simples ou um ponto)
    const markerStyle = new ol.style.Style({
        image: new ol.style.Icon({
            src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Exemplo de ícone de marcador
            scale: 0.1 // Tamanho do ícone
        })
    });
    
    // Aplica o estilo à feature
    marker.setStyle(markerStyle);

    // Cria uma camada vetorial para o marcador
    const vectorSource = new ol.source.Vector({
        features: [marker]
    });

    const markerLayer = new ol.layer.Vector({
        source: vectorSource
    });

    // Adiciona a camada de marcador ao mapa
    map.addLayer(markerLayer);
}

// Função para verificar a área de transferência e centralizar o mapa com o marcador
async function checkClipboardForCoordinates() {
    try {
        // Verifica se o navegador suporta a Clipboard API
        if (navigator.clipboard && navigator.clipboard.readText) {
            // Lê o conteúdo da área de transferência
            const clipboardText = await navigator.clipboard.readText();

            // Regex para identificar possíveis coordenadas (latitude e longitude)
            const coordinateRegex = /(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/;
            const match = clipboardText.match(coordinateRegex);

            if (match) {
                const latitude = parseFloat(match[1]);
                const longitude = parseFloat(match[3]);

                if (!isNaN(latitude) && !isNaN(longitude)) {
                    // Centraliza o mapa nas coordenadas fornecidas
                    const coords = ol.proj.fromLonLat([longitude, latitude]);
                    const view = map.getView();
                    view.setCenter(coords);
                    view.setZoom(13); // Zoom adequado para visualização inicial

                    // Adiciona um marcador nas coordenadas
                    addMarker(longitude, latitude);

                    return; // Sai da função já que conseguimos as coordenadas
                }
            }
        }
    } catch (err) {
        console.error('Erro ao acessar a área de transferência: ', err);
    }

    // Coordenadas padrão se não houver coordenadas na área de transferência
    map.getView().fit([-7402567.245453, -4169624.264522, -3531733.522557, -2197182.037028], map.getSize());
}

// Inicializa o mapa ao carregar a página e faz a busca de coordenadas
window.addEventListener('load', () => {
    checkClipboardForCoordinates();
});

////small screen definition
    var hasTouchScreen = map.getViewport().classList.contains('ol-touch');
    var isSmallScreen = window.innerWidth < 650;

////controls container

    //top left container
    var topLeftContainer = new ol.control.Control({
        element: (() => {
            var topLeftContainer = document.createElement('div');
            topLeftContainer.id = 'top-left-container';
            return topLeftContainer;
        })(),
    });
    map.addControl(topLeftContainer)

    //bottom left container
    var bottomLeftContainer = new ol.control.Control({
        element: (() => {
            var bottomLeftContainer = document.createElement('div');
            bottomLeftContainer.id = 'bottom-left-container';
            return bottomLeftContainer;
        })(),
    });
    map.addControl(bottomLeftContainer)
  
    //top right container
    var topRightContainer = new ol.control.Control({
        element: (() => {
            var topRightContainer = document.createElement('div');
            topRightContainer.id = 'top-right-container';
            return topRightContainer;
        })(),
    });
    map.addControl(topRightContainer)

    //bottom right container
    var bottomRightContainer = new ol.control.Control({
        element: (() => {
            var bottomRightContainer = document.createElement('div');
            bottomRightContainer.id = 'bottom-right-container';
            return bottomRightContainer;
        })(),
    });
    map.addControl(bottomRightContainer)

//popup
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var sketch;

closer.onclick = function() {
    container.style.display = 'none';
    closer.blur();
    return false;
};
var overlayPopup = new ol.Overlay({
    element: container
});
map.addOverlay(overlayPopup)
    
    
var NO_POPUP = 0
var ALL_FIELDS = 1

/**
 * Returns either NO_POPUP, ALL_FIELDS or the name of a single field to use for
 * a given layer
 * @param layerList {Array} List of ol.Layer instances
 * @param layer {ol.Layer} Layer to find field info about
 */
function getPopupFields(layerList, layer) {
    // Determine the index that the layer will have in the popupLayers Array,
    // if the layersList contains more items than popupLayers then we need to
    // adjust the index to take into account the base maps group
    var idx = layersList.indexOf(layer) - (layersList.length - popupLayers.length);
    return popupLayers[idx];
}

//highligth collection
var collection = new ol.Collection();
var featureOverlay = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: collection,
        useSpatialIndex: false // optional, might improve performance
    }),
    style: [new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#f00',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255,0,0,0.1)'
        }),
    })],
    updateWhileAnimating: true, // optional, for instant visual feedback
    updateWhileInteracting: true // optional, for instant visual feedback
});

var doHighlight = false;
var doHover = false;

function createPopupField(currentFeature, currentFeatureKeys, layer) {
    let popupText = '';
    let popupInfo = {};

    for (let i = 0; i < currentFeatureKeys.length; i++) {
        const fieldName = currentFeatureKeys[i];
        const fieldValue = currentFeature.get(fieldName);
        if (fieldName === 'geometry' || layer.get('fieldLabels')[fieldName] === "hidden field") continue;

        popupText += '<tr>';
        popupText += layer.get('fieldLabels')[fieldName].includes("label")
            ? `<th>${layer.get('fieldAliases')[fieldName]}</th><td>`
            : `<td colspan="2">`;

        popupText += fieldValue != null
            ? autolinker.link(fieldValue.toLocaleString())
            : 'Sem Dados';

        popupText += '</td></tr>';
        popupInfo[fieldName] = fieldValue;
    }

    const coordinates = getCoordinatesFromFeature(currentFeature);
    if (!coordinates) return popupText; // Evita erros em features inválidas

    const popupInfoEscaped = JSON.stringify(popupInfo)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    popupText += `
        <tr>
            <td colspan="2">
                <button onclick="downloadKML(${JSON.stringify(coordinates)}, 'Nome', 'Descrição', ${popupInfoEscaped})">Baixar KML</button>
                <button onclick="downloadGeoJSON(${JSON.stringify(coordinates)}, 'Nome', 'Descrição', ${popupInfoEscaped})">Baixar GeoJSON</button>
                <button onclick="downloadTXT(${popupInfoEscaped})">Baixar TXT</button>
                <button onclick="downloadShapefileHTTP(${JSON.stringify(coordinates)}, 'Nome', 'Descrição', ${popupInfoEscaped})">Baixar Shapefile</button>
            </td>
        </tr>`;
    return popupText;
}


function getCoordinatesFromFeature(feature) {
    const geometry = feature.getGeometry();
    if (!geometry) {
        console.error("Feature não possui geometria.");
        return null;
    }

    if (geometry.getType() === 'Point') {
        return [geometry.getCoordinates()];
    } else if (geometry.getType() === 'MultiPolygon') {
        return geometry.getCoordinates();
    } else {
        console.error("Tipo de geometria não suportado:", geometry.getType());
        return null;
    }
}

function downloadTXT(popupInfo) {
    if (!popupInfo || typeof popupInfo !== 'object') {
        console.error("Informações inválidas para gerar o TXT.");
        return;
    }

    const nomeArquivo = popupInfo.parcela_co || popupInfo.num_proces || popupInfo.nr_process ||   popupInfo.cd_sipra|| "arquivo_dados";
    let txtContent = `Dados da Feature:\n\n`;

    for (let field in popupInfo) {
        if (Object.prototype.hasOwnProperty.call(popupInfo, field)) {
            let value = popupInfo[field];
            if (typeof value === 'object') {
                value = JSON.stringify(value, null, 2);
            }
            txtContent += `${field}: ${value}\n`;
        }
    }

    try {
        const blob = new Blob([txtContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${nomeArquivo}.txt`;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error("Erro ao gerar o arquivo TXT:", error);
    }
}

function downloadKML(coordinates, nome, descricao, popupInfo) {
    const nomeArquivo = popupInfo.parcela_co || popupInfo.num_proces || popupInfo.cd_sipra || pupuInfo.nr_process || "arquivo_dados";

    function convertToLatLon(x, y) {
        const RADIUS = 6378137.0;
        const longitude = (x / RADIUS) * (180 / Math.PI);
        const latitude = (Math.atan(Math.exp(y / RADIUS)) * 360 / Math.PI) - 90;

        if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
            console.error(`Coordenada inválida detectada: [${longitude}, ${latitude}]`);
            return null;
        }
        return [longitude, latitude];
    }

    if (!coordinates) {
        console.error("Coordenadas inválidas para gerar o KML.");
        return;
    }

    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
        <Placemark>
            <name>${nome || ""}</name>
            <description>${descricao || ""}</description>`;

    if (coordinates.length > 0 && Array.isArray(coordinates[0][0])) {
        kmlContent += `<MultiGeometry>`;
        coordinates.forEach(polygon => {
            const coordString = polygon[0]
                .map(coord => {
                    const [longitude, latitude] = convertToLatLon(coord[0], coord[1]);
                    return longitude !== null && latitude !== null ? `${longitude},${latitude},0` : null;
                })
                .filter(Boolean) // Remove coordenadas inválidas
                .join(' '); // Junta as coordenadas em uma única linha

            kmlContent += `<Polygon><outerBoundaryIs><LinearRing>
              <coordinates>${coordString}</coordinates>
            </LinearRing></outerBoundaryIs></Polygon>`;
        });
        kmlContent += `</MultiGeometry>`;
    } else {
        const [longitude, latitude] = convertToLatLon(coordinates[0], coordinates[1]);
        if (longitude !== null && latitude !== null) {
            kmlContent += `<Point><coordinates>${longitude},${latitude},0</coordinates></Point>`;
        }
    }

    kmlContent += `</Placemark></kml>`;

    const blob = new Blob([kmlContent], { type: "application/vnd.google-earth.kml+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeArquivo}.kml`;
    link.click();
    URL.revokeObjectURL(url);
}


function downloadGeoJSON(coordinates, nome, descricao, popupInfo) {
    const nomeArquivo = popupInfo.parcela_co || popupInfo.num_proces || popupInfo.cd_sipra || pupuInfo.nr_process || "arquivo_dados";

    if (!coordinates) {
        console.error("Coordenadas inválidas para gerar o GeoJSON.");
        return;
    }

    let geoJSONContent = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "",
                    coordinates: null
                },
                properties: {
                    name: nome || "Sem Nome",
                    description: descricao || "Sem Descrição"
                }
            }
        ]
    };

    if (coordinates.length > 0 && Array.isArray(coordinates[0][0])) {
        geoJSONContent.features[0].geometry.type = "MultiPolygon";
        geoJSONContent.features[0].geometry.coordinates = coordinates.map(polygon => {
             return [polygon[0].map(coord => {
                const convertedCoord = convertToLatLon(coord[0], coord[1]);
                return convertedCoord ? convertedCoord : null;
            }).filter(Boolean)];
        });
    } else {
        geoJSONContent.features[0].geometry.type = "Point";
        const convertedCoord = convertToLatLon(coordinates[0], coordinates[1]);
        geoJSONContent.features[0].geometry.coordinates = convertedCoord ? convertedCoord : null;
    }

    if (!geoJSONContent.features[0].geometry.coordinates) {
        console.error("Erro ao converter as coordenadas. GeoJSON não gerado.");
        return;
    }

    const blob = new Blob([JSON.stringify(geoJSONContent, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeArquivo}.geojson`;
    link.click();
    URL.revokeObjectURL(url);

    function convertToLatLon(x, y) {
        const RADIUS = 6378137.0;
        const longitude = (x / RADIUS) * (180 / Math.PI);
        const latitude = (Math.atan(Math.exp(y / RADIUS)) * 360 / Math.PI) - 90;
        return [longitude, latitude];
    }
}





async function downloadShapefileHTTP(coordinates, nome, descricao, popupInfo) {
    const nomeArquivo = popupInfo.parcela_co || popupInfo.num_proces || popupInfo.cd_sipra || pupuInfo.nr_process || "arquivo_dados";

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        console.error("Coordenadas inválidas para gerar o shapefile.");
        return;
    }

    // Converter as coordenadas de Web Mercator para Latitude/Longitude
    const convertedCoordinates = coordinates.map(polygon => {
        return polygon[0].map(coord => {
            const convertedCoord = convertToLatLon(coord[0], coord[1]);
            return convertedCoord ? convertedCoord : null;
        }).filter(Boolean);
    });

    // Gerar o GeoJSON com as coordenadas convertidas
    const geoJSONContent = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "Polygon", // Ajuste para MultiPolygon se necessário
                    coordinates: convertedCoordinates
                },
                properties: {
                    name: nome || "Sem Nome",
                    description: descricao || "Sem Descrição"
                }
            }
        ]
    };

    // Definir o conteúdo do arquivo .prj
    const prjContent = `GEOGCS["WGS 84",
    DATUM["WGS_1984",
    SPHEROID["WGS 84",6378137,298.257223563]], 
    PRIMEM["Greenwich",0],
    UNIT["degree",0.0174532925199433]]`;

    try {
        // Gerar o shapefile com o conteúdo GeoJSON e o arquivo .prj
        const zipBase64 = await shpwrite.zip(geoJSONContent, {
            folder: "shapefile",
            types: {
                prj: prjContent
            }
        });

        if (!zipBase64) {
            console.error("Erro: zipBase64 não foi criado.");
            return;
        }

        // Converter base64 para blob
        const byteCharacters = atob(zipBase64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
            const slice = byteCharacters.slice(offset, offset + 1024);
            const byteNumbers = Array.from(slice).map(char => char.charCodeAt(0));
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        const zipBlob = new Blob(byteArrays, { type: 'application/zip' });

        // Criar uma URL temporária e baixar o arquivo
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${nomeArquivo}.zip`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao gerar o shapefile:", error);
    }
}

// Função para converter de Web Mercator para Latitude/Longitude
function convertToLatLon(x, y) {
    const RADIUS = 6378137.0;
    const longitude = (x / RADIUS) * (180 / Math.PI);
    const latitude = (Math.atan(Math.exp(y / RADIUS)) * 360 / Math.PI) - 90;
    return [longitude, latitude];
}

var highlight;
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

function onPointerMove(evt) {
    if (!doHover && !doHighlight) {
        return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var popupField;
    var currentFeature;
    var currentLayer;
    var currentFeatureKeys;
    var clusteredFeatures;
    var clusterLenght;
    var popupText = '<ul>';
    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") == undefined)) {
            var doPopup = false;
            for (k in layer.get('fieldImages')) {
                if (layer.get('fieldImages')[k] != "Hidden") {
                    doPopup = true;
                }
            }
            currentFeature = feature;
            currentLayer = layer;
            clusteredFeatures = feature.get("features");
            if (clusteredFeatures) {
				clusterLenght = clusteredFeatures.length;
			}
            var clusterFeature;
            if (typeof clusteredFeatures !== "undefined") {
                if (doPopup) {
                    for(var n=0; n<clusteredFeatures.length; n++) {
                        currentFeature = clusteredFeatures[n];
                        currentFeatureKeys = currentFeature.getKeys();
                        popupText += '<li><table>'
                        popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                        popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                        popupText += '</table></li>';    
                    }
                }
            } else {
                currentFeatureKeys = currentFeature.getKeys();
                if (doPopup) {
                    popupText += '<li><table>';
                    popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                    popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                    popupText += '</table></li>';
                }
            }
        }
    });
    if (popupText == '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
    
	if (doHighlight) {
        if (currentFeature !== highlight) {
            if (highlight) {
                featureOverlay.getSource().removeFeature(highlight);
            }
            if (currentFeature) {
                var featureStyle
                if (typeof clusteredFeatures == "undefined") {
					var style = currentLayer.getStyle();
					var styleFunction = typeof style === 'function' ? style : function() { return style; };
					featureStyle = styleFunction(currentFeature)[0];
				} else {
					featureStyle = currentLayer.getStyle().toString();
				}

                if (currentFeature.getGeometry().getType() == 'Point' || currentFeature.getGeometry().getType() == 'MultiPoint') {
                    var radius
					if (typeof clusteredFeatures == "undefined") {
						radius = featureStyle.getImage().getRadius();
					} else {
						radius = parseFloat(featureStyle.split('radius')[1].split(' ')[1]) + clusterLenght;
					}

                    highlightStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({
                                color: "#ffff00"
                            }),
                            radius: radius
                        })
                    })
                } else if (currentFeature.getGeometry().getType() == 'LineString' || currentFeature.getGeometry().getType() == 'MultiLineString') {

                    var featureWidth = featureStyle.getStroke().getWidth();

                    highlightStyle = new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: '#ffff00',
                            lineDash: null,
                            width: featureWidth
                        })
                    });

                } else {
                    highlightStyle = new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: '#ffff00'
                        })
                    })
                }
                featureOverlay.getSource().addFeature(currentFeature);
                featureOverlay.setStyle(highlightStyle);
            }
            highlight = currentFeature;
        }
    }

    if (doHover) {
        if (popupText) {
            overlayPopup.setPosition(coord);
            content.innerHTML = popupText;
            container.style.display = 'block';        
        } else {
            container.style.display = 'none';
            closer.blur();
        }
    }
};

map.on('pointermove', onPointerMove);

var popupContent = '';
var popupCoord = null;
var featuresPopupActive = false;

function updatePopup() {
    if (popupContent) {
        overlayPopup.setPosition(popupCoord);
        content.innerHTML = popupContent;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        closer.blur();
    }
} 

function onSingleClickFeatures(evt) {
    if (doHover || sketch) {
        return;
    }
    if (!featuresPopupActive) {
        featuresPopupActive = true;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var popupField;
    var currentFeature;
    var currentFeatureKeys;
    var clusteredFeatures;
    var popupText = '<ul>';
    
    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") === undefined)) {
            var doPopup = false;
            for (var k in layer.get('fieldImages')) {
                if (layer.get('fieldImages')[k] !== "Hidden") {
                    doPopup = true;
                }
            }
            currentFeature = feature;
            clusteredFeatures = feature.get("features");
            if (typeof clusteredFeatures !== "undefined") {
                if (doPopup) {
                    for(var n = 0; n < clusteredFeatures.length; n++) {
                        currentFeature = clusteredFeatures[n];
                        currentFeatureKeys = currentFeature.getKeys();
                        popupText += '<li><table>';
                        popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                        popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                        popupText += '</table></li>';    
                    }
                }
            } else {
                currentFeatureKeys = currentFeature.getKeys();
                if (doPopup) {
                    popupText += '<li><table>';
                    popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                    popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                    popupText += '</table>';
                }
            }
        }
    });
    if (popupText === '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
	
	popupContent = popupText;
    popupCoord = coord;
    updatePopup();
}

function onSingleClickWMS(evt) {
    if (doHover || sketch) {
        return;
    }
	if (!featuresPopupActive) {
		popupContent = '';
	}
    var coord = evt.coordinate;
    var viewProjection = map.getView().getProjection();
    var viewResolution = map.getView().getResolution();

    for (var i = 0; i < wms_layers.length; i++) {
        if (wms_layers[i][1] && wms_layers[i][0].getVisible()) {
            var url = wms_layers[i][0].getSource().getFeatureInfoUrl(
                evt.coordinate, viewResolution, viewProjection, {
                    'INFO_FORMAT': 'text/html',
                });
            if (url) {				
                const wmsTitle = wms_layers[i][0].get('popuplayertitle');					
                var ldsRoller = '<div id="lds-roller"><img class="lds-roller-img" style="height: 25px; width: 25px;"></img></div>';
				
                popupCoord = coord;
				popupContent += ldsRoller;
                updatePopup();

                var timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Timeout exceeded'));
                    }, 5000); // (5 second)
                });

                Promise.race([
                    fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url)),
                    timeoutPromise
                ])
                .then((response) => {
                    if (response.ok) {
                        return response.text();
                    }
                })
                .then((html) => {
                    if (html.indexOf('<table') !== -1) {
                        popupContent += '<a><b>' + wmsTitle + '</b></a>';
                        popupContent += html + '<p></p>';
                        updatePopup();
                    }
                })
                // .catch((error) => {
				// })
                .finally(() => {
                    setTimeout(() => {
                        var loaderIcon = document.querySelector('#lds-roller');
						loaderIcon.remove();
                    }, 500); // (0.5 second)	
                });
            }
        }
    }
}

map.on('singleclick', onSingleClickFeatures);
map.on('singleclick', onSingleClickWMS);

//get container
var topLeftContainerDiv = document.getElementById('top-left-container')
var bottomLeftContainerDiv = document.getElementById('bottom-left-container')
var bottomRightContainerDiv = document.getElementById('bottom-right-container')

//title

//abstract


//geolocate

isTracking = false;
var geolocateControl = (function (Control) {
    geolocateControl = function(opt_options) {
        var options = opt_options || {};
        var button = document.createElement('button');
        button.className += ' fa fa-map-marker';
        var handleGeolocate = function() {
            if (isTracking) {
                map.removeLayer(geolocateOverlay);
                isTracking = false;
          } else if (geolocation.getTracking()) {
                map.addLayer(geolocateOverlay);
                map.getView().setCenter(geolocation.getPosition());
                isTracking = true;
          }
        };
        button.addEventListener('click', handleGeolocate, false);
        button.addEventListener('touchstart', handleGeolocate, false);
        var element = document.createElement('div');
        element.className = 'geolocate ol-unselectable ol-control';
        element.appendChild(button);
        ol.control.Control.call(this, {
            element: element,
            target: options.target
        });
    };
    if (Control) geolocateControl.__proto__ = Control;
    geolocateControl.prototype = Object.create(Control && Control.prototype);
    geolocateControl.prototype.constructor = geolocateControl;
    return geolocateControl;
}(ol.control.Control));
map.addControl(new geolocateControl())

      var geolocation = new ol.Geolocation({
  projection: map.getView().getProjection()
});


var accuracyFeature = new ol.Feature();
geolocation.on('change:accuracyGeometry', function() {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

var positionFeature = new ol.Feature();
positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

geolocation.on('change:position', function() {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ?
      new ol.geom.Point(coordinates) : null);
});

var geolocateOverlay = new ol.layer.Vector({
  source: new ol.source.Vector({
    features: [accuracyFeature, positionFeature]
  })
});

geolocation.setTracking(true);


//measurement





//geocoder

var geocoder = new Geocoder('nominatim', {
    provider: 'osm',
    lang: 'en-US',
    placeholder: 'Digite cordenada ou local...',
    limit: 5,
    keepOpen: true,
  });
  map.addControl(geocoder);
  document.getElementsByClassName('gcd-gl-btn')[0].className += ' fa fa-search';
  
  geocoder.on('addresschosen', function (evt) {
      const coordinates = evt.coordinate;  // Obtenha as coordenadas 
      map.getView().animate({               // Anima a centralização do mapa
        center: coordinates,
        zoom: 12                            // Define o nível de zoom
      });
    });


//layer search


//scalebar


//layerswitcher

var layerSwitcher = new ol.control.LayerSwitcher({
    activationMode: 'click',
	startActive: true,
	tipLabel: "Layers",
    target: 'top-right-container',
	collapseLabel: '»',
	collapseTipLabel: 'Close'
    });
map.addControl(layerSwitcher);
if (hasTouchScreen || isSmallScreen) {
	document.addEventListener('DOMContentLoaded', function() {
		setTimeout(function() {
			layerSwitcher.hidePanel();
		}, 500);
	});	
}






//attribution
var bottomAttribution = new ol.control.Attribution({
  collapsible: false,
  collapsed: false,
  className: 'bottom-attribution'
});
map.addControl(bottomAttribution);

var attributionList = document.createElement('li');
attributionList.innerHTML = `
	<a href="https://www.amicrocad.com.br/">Microcad</a> &middot;
	<a href="https://github.com/FelipeUCAA">Dev</a> &middot;
	<a href="https://openlayers.org/">OpenLayers</a> &middot;
	<a href="https://qgis.org/">QGIS</a>	
`;
bottomAttribution.element.appendChild(attributionList);


// Disable "popup on hover" or "highlight on hover" if ol-control mouseover
document.addEventListener('DOMContentLoaded', function() {
    var preDoHover = doHover;
	var preDoHighlight = doHighlight;
	if (doHover || doHighlight) {
		var controlElements = document.getElementsByClassName('ol-control');
		for (var i = 0; i < controlElements.length; i++) {
			controlElements[i].addEventListener('mouseover', function() {
				if (doHover) { doHover = false; }
				if (doHighlight) { doHighlight = false; }
			});
			controlElements[i].addEventListener('mouseout', function() {
				doHover = preDoHover;
				doHighlight = preDoHighlight;
			});
		}
	}
});


//move controls inside containers, in order
    //zoom
    var zoomControl = document.getElementsByClassName('ol-zoom')[0];
    if (zoomControl) {
        topLeftContainerDiv.appendChild(zoomControl);
    }
    //geolocate
    var geolocateControl = document.getElementsByClassName('geolocate')[0];
    if (geolocateControl) {
        topLeftContainerDiv.appendChild(geolocateControl);
    }
    //measure
    var measureControl = document.getElementsByClassName('measure-control')[0];
    if (measureControl) {
        topLeftContainerDiv.appendChild(measureControl);
    }
    //geocoder
    var geocoderControl = document.getElementsByClassName('ol-geocoder')[0];
    if (geocoderControl) {
        topLeftContainerDiv.appendChild(geocoderControl);
    }
    //search layer
    var searchLayerControl = document.getElementsByClassName('search-layer')[0];
    if (searchLayerControl) {
        topLeftContainerDiv.appendChild(searchLayerControl);
    }
    //scale line
    var scaleLineControl = document.getElementsByClassName('ol-scale-line')[0];
    if (scaleLineControl) {
        scaleLineControl.className += ' ol-control';
        bottomLeftContainerDiv.appendChild(scaleLineControl);
    }
    //attribution
    var attributionControl = document.getElementsByClassName('bottom-attribution')[0];
    if (attributionControl) {
        bottomRightContainerDiv.appendChild(attributionControl);
    }