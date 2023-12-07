import { NodeCounts } from '@/features/dashboard/components/NodeCounts';
import { Posture } from '@/features/dashboard/components/Posture';
import { TopAttackPaths } from '@/features/dashboard/components/TopAttackPath';
import { TopRisks } from '@/features/dashboard/components/TopRisks';
import { TopRisksRuntimeDummy } from '@/features/dashboard/components/TopRisksRuntimeDummy';

const Dashboard = () => {
  return (
    <div className="overflow-auto p-4 grid grid-cols-4 gap-4">
      <div className="col-span-4">
        <NodeCounts />
      </div>
      <div className="col-span-4 xl:col-span-2 min-h-[360px]">
        <TopAttackPaths />
      </div>
      <div className="col-span-2 xl:col-span-1">
        <TopRisks type="vulnerability" to="/vulnerability/unique-vulnerabilities" />
      </div>
      <div className="col-span-2 xl:col-span-1">
        <TopRisksRuntimeDummy />
      </div>
      <div className="col-span-4 xl:col-span-2 min-h-[360px]">
        <Posture />
      </div>
      <div className="col-span-2 xl:col-span-1">
        <TopRisks type="secret" to="/secret/unique-secrets" />
      </div>
      <div className="col-span-2 xl:col-span-1">
        <TopRisks type="malware" to="/malware/unique-malwares" />
      </div>
    </div>
  );
};

export const module = {
  element: <Dashboard />,
};
