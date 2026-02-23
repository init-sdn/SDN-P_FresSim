import React, { useEffect, useState, useRef, useCallback } from "react";
import { Modal } from "react-bootstrap";
import { Line } from "react-chartjs-2";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ChartAnnotation from "chartjs-plugin-annotation";
import JSZip from "jszip";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartAnnotation,
  Filler
);

const Graph = ({
  show,
  handleClose,
  selectedGateways,
  openedMarker,
  minAltitude,
  maxAltitude,
  apiID,
  apiKeys,
}) => {
  const [chartsData, setChartsData] = useState([]);
  const chartRefs = useRef([]);

  const generateAndDownloadZip = useCallback(async () => {
    const zip = new JSZip();

    for (let i = 0; i < chartsData.length; i++) {
      const chart = chartRefs.current[i];
      if (chart && chart.canvas) {
        const image = chart.canvas.toDataURL("image/png");
        zip.file(`chart-${i + 1}.png`, image.split("base64,")[1], {
          base64: true,
        });
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Código para descargar el archivo zip
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "charts.zip";
    a.click();
  }, [chartsData]);

  const calculateAngleOfElevation = (a, b) => {
    return Math.atan2(a, b);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (show && openedMarker && selectedGateways && selectedGateways.length > 0) {
        try {
          const response = await fetch('/fressim/api/generate-graph-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              marker: openedMarker,
              selectedGateways,
              minAltitude,
              maxAltitude,
              apiID,
              apiKeys,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setChartsData(result.allChartData);
          } else {
            console.error('Error fetching graph data');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    };

    fetchData();
  }, [show, openedMarker, selectedGateways, minAltitude, maxAltitude]);

  const ellipsePlugin = {
    id: "customEllipse",
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      // Acceder a los parámetros de la elipse
      const ellipseOptions = chart.options.plugins.customEllipse;
      if (!ellipseOptions) return;

      const heightValue = ellipseOptions.height;
      const gwAlt = ellipseOptions.gwAlt;
      const markAlt = ellipseOptions.markAlt;
      const totalDistance = ellipseOptions.totalDistance;

      const centerX =
        (xScale.getPixelForValue(0) + xScale.getPixelForValue(totalDistance)) /
        2;
      const centerY =
        (yScale.getPixelForValue(gwAlt) + yScale.getPixelForValue(markAlt)) / 2;

      const elevationDiff =
        yScale.getPixelForValue(gwAlt) - yScale.getPixelForValue(markAlt);
      const distance =
        xScale.getPixelForValue(totalDistance) - xScale.getPixelForValue(0);
      const rotationAngle = calculateAngleOfElevation(elevationDiff, distance);

      const hipotenusa = Math.sqrt(
        Math.pow(Math.abs(elevationDiff), 2) + Math.pow(distance, 2)
      );

      const heightPixel =
        yScale.getPixelForValue(0) - yScale.getPixelForValue(heightValue);

      ctx.save();
      ctx.beginPath();
      ctx.translate(centerX, centerY); // Traslada al centro de la elipse
      ctx.rotate(rotationAngle); // Rota alrededor del centro
      ctx.ellipse(0, 0, hipotenusa / 2, heightPixel / 2, 0, 0, 2 * Math.PI);

      ctx.strokeStyle = "blue";
      ctx.stroke();

      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.fill();

      ctx.restore();
    },
  };

  ChartJS.register(ellipsePlugin);

  return (
    <Modal className="custom-modal" show={show} onHide={handleClose} size="lr">
      <Modal.Header closeButton>
        <Modal.Title>Altitude Graphs</Modal.Title>
        {selectedGateways && (
          <button
            onClick={generateAndDownloadZip}
            className="btn btn-primary"
            style={{ marginLeft: '40%' }}
          >
            {selectedGateways && selectedGateways.length > 1
              ? "Download graphs"
              : "Download graph"}
          </button>
        )}
      </Modal.Header>
      <Modal.Body className="modal-body-scrollable">
        {chartsData.map((chartData, index) => (
          <React.Fragment key={index}>
            {chartData && chartData.datasets.length > 0 && (
              <div className="graph-container">
                <Line
                  data={chartData}
                  options={chartData.options}
                  ref={(el) => (chartRefs.current[index] = el)}
                />
                <hr />
              </div>
            )}
          </React.Fragment>
        ))}
      </Modal.Body>
    </Modal>
  );
};

export default Graph;