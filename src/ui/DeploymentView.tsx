import { DeploymentUse } from '../domain/enums';

export const DeploymentView = ({ deploymentUse, note }: { deploymentUse: DeploymentUse; note?: string }) => (
  <section>
    <h3>Deployment View</h3>
    <p>Bounded output: {deploymentUse}</p>
    <p>{note ?? 'No trade-use note.'}</p>
    <p>Must not dictate exact entry/stop/size.</p>
  </section>
);
