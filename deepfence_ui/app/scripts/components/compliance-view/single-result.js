import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSingleComplianceResultAction, toaster } from '../../actions';
import AppLoader from '../common/app-loader/app-loader';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { ComplianceTestModal } from './test-modal';

export const SingleComplianceResult = props => {
  const docId = props.match?.params?.docId;
  const complianceType = props.match?.params?.complianceType;

  const dispatch = useDispatch();

  const { testData, testDataLoading } = useSelector(state => {
    return {
      testDataLoading: state.getIn(
        ['compliance_single_result', docId, 'loading'],
        true
      ),
      testData: state.getIn(['compliance_single_result', docId, 'data'], null),
    };
  });

  useEffect(() => {
    dispatch(
      getSingleComplianceResultAction({
        docId,
        complianceType:
          complianceType?.toLowerCase?.() === 'compliance'
            ? 'compliance'
            : 'cloud-compliance-scan',
      })
    );
  }, []);

  useEffect(() => {
    if (!testDataLoading && !testData) {
      dispatch(toaster('The requested compliance result could not be found'));
      props.history.push('/compliance');
    }
  }, [testData, testDataLoading]);

  return (
    <AuthenticatedLayout>
      {testDataLoading ? <AppLoader /> : null}
      {testData && !testDataLoading ? (
        <ComplianceTestModal
          data={testData?._source}
          onRequestClose={() => {
            props.history.push('/compliance');
          }}
        />
      ) : null}
    </AuthenticatedLayout>
  );
};
