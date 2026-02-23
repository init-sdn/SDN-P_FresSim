// api/get-elevation.js
/*
Get the elevation of a point using different APIs.
*/

import axios from 'axios';
import {Client} from "@googlemaps/google-maps-services-js";
import config from './config.json';

const ELEVATION_API_URL_BING = config.ELEVATION_API_URL_BING;
const ELEVATION_API_URL_OPEN_METEO = config.ELEVATION_API_URL_OPEN_METEO;
const GOOGLE_API_ID = config.GOOGLE_API_ID;
const BING_API_ID = config.BING_API_ID;
const OPEN_METEO_API_ID = config.OPEN_METEO_API_ID;
const OPEN_TOPO_API_ID = config.OPEN_TOPO_API_ID;
const ELEVATION_API_URL_OPEN_TOPO = config.ELEVATION_API_URL_OPEN_TOPO;
const DEFAULT_GROUND_ALTITUDE = config.DEFAULT_ALTITUDE;
const TIMEOUT = config.TIMEOUT;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
        const { points, apiID, apiKeys } = req.body;

        if (!points || !apiID || !apiKeys) {
          return res.status(400).json({ error: 'Missing elements on elevation API proxy' });
        }

        switch (apiID) {
            case GOOGLE_API_ID:
                //Get a point's elevation using Google Maps API
                const client = new Client({});
                let elevation = [];
                let response = null;

                await client.elevation({
                    params: {
                        locations: points,
                        key: apiKeys.google,
                    },
                    timeout: 1000, // milliseconds
                    })
                    .then((r) => {
                        response = r.data;

                    })
                    .catch((e) => {
                        console.log(e.response.data.error_message);
                    });
                    
                    response.results.forEach(function(item) {
                        elevation.push(Math.round(item.elevation));
                    });

                res.status(200).json(elevation); 
                break;
                
            
            case BING_API_ID:
                //Get a point's elevation using Bing Maps API
                const pointString = `${points[0].lat},${points[0].lng}`;

                try {
                    const response = await axios.get(`${ELEVATION_API_URL_BING}key=${apiKeys.bing}&points=${pointString}`, { timeout: TIMEOUT });
                    const elevation = response.data.resourceSets[0].resources[0].elevations[0];

                    res.status(200).json(Math.round(elevation)); 

                } catch (error) {
                    console.error('Error fetching elevations:', error);
                    return DEFAULT_GROUND_ALTITUDE; // Devuelve altitud por defecto.
                }
                break;

            case OPEN_METEO_API_ID:
                //Get a point's elevation using Open-Meteo Maps API
                try {
                    const response = await axios.get(`${ELEVATION_API_URL_OPEN_METEO}latitude=${points[0].lat}&longitude=${points[0].lng}`, { timeout: TIMEOUT });
                    const elevation = response.data.elevation[0];

                    res.status(200).json(Math.round(elevation)); 

                  } catch (error) {
                    console.error('Error fetching elevations:', error);
                    return points.map(() => DEFAULT_ALTITUDE);
                  }
                  break;

            case OPEN_TOPO_API_ID:
                const point = `${points[0].lat},${points[0].lng}`;

                try {
                    const response = await axios.get(`${ELEVATION_API_URL_OPEN_TOPO}locations=${point}`, { timeout: TIMEOUT });
                    const elevation = response.data.results.map(result => result.elevation);

                    res.status(200).json(Math.round(elevation)); 

                } catch (error) {
                    console.error('Error fetching elevations:', error);
                    return DEFAULT_GROUND_ALTITUDE; // Devuelve altitud por defecto.
                }

                break;

            default:
                return res.status(400).json({ error: 'Invalid API ID' });
            }
        

      } catch (error) {
        res.status(500).json({ error: 'Error checking communication' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}