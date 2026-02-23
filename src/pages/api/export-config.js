// api/export-config.js
/*
Export the necessary configuration data for the client. It is obtained from the general configuration file.
*/

import axios from 'axios';
import config from './config.json';


export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
        const {} = req.body;

        const configurations = {
            generatorModes:{
                speed: config.GENERATOR_MODE_SPEED,
                precision: config.GENERATOR_MODE_PRECISION
            },
            availableModes: config.AVAILABLE_GENERATOR_MODES,
            generatorModesUrls:{
                speed: config.GENERATOR_MODE_URL_SPEED,
                precision: config.GENERATOR_MODE_URL_PRECISION
            },
            availableAPIs: config.AVAILABLE_APIS,
            apiIDs:{
                openMeteo: config.OPEN_METEO_API_ID,
                google: config.GOOGLE_API_ID,
                bing: config.BING_API_ID,
                openTopo: config.OPEN_TOPO_API_ID
            },
            availableRatios: config.AVAILABLE_RATIOS,
            defaultNodeGroundElevation: config.DEFAULT_NODE_GROUND_ELEVATION,
            colors:{
                fullCommunicationColor: config.FULL_COMMUNICATION_COLOR,
                noCommunicationColor: config.NO_COMMUNICATION_COLOR,
                poorCommunicationColor: config.POOR_COMMUNICATION_COLOR,
                nullCommunicationColor: config.NULL_COMMUNICATION_COLOR
            },
            apiPointsBatch:{
                openMeteo: config.OPEN_METEO_MAX_POINTS_PER_BATCH,
                google: config.GOOGLE_MAX_POINTS_PER_BATCH,
                bing: config.BING_MAX_POINTS_PER_BATCH,
                openTopo: config.OPEN_TOPO_MAX_POINTS_PER_BATCH
            },
            defaultElevationPoints: config.ELEVATION_POINTS,
            timeout: config.TIMEOUT,
        };
        
        res.status(200).json({ configurations }); 

      } catch (error) {
        res.status(500).json({ error: 'Error exporting configurations' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}