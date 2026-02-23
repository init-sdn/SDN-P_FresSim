import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./DynamicMap'), {
  ssr: false
});

const Map = ({ markers, gateways, setMarkers, setGateways, fileInfo, setFileInfo, handleOpenGatewayAssignModal, handleOpenGraphGeneratorModal, handleOpenRadiusGeneratorModal, setJsonLoaded, ...props }) => {
  return (
    <div>
      <DynamicMap markers={markers} gateways={gateways} setMarkers={setMarkers} setGateways={setGateways} fileInfo={fileInfo} setFileInfo={setFileInfo} handleOpenGatewayAssignModal={handleOpenGatewayAssignModal} handleOpenGraphGeneratorModal={handleOpenGraphGeneratorModal} handleOpenRadiusGeneratorModal={handleOpenRadiusGeneratorModal} setJsonLoaded={setJsonLoaded} {...props} />
    </div>
  )
}

export default Map;