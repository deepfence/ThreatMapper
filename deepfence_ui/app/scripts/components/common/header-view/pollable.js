/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import {connect} from 'react-redux';
import {makeCancellable} from '../../../utils/promise-utils';

const pollable = (config = {}) => (
  (WrappedComponent) => {
    class PollableHOC extends React.PureComponent {
      constructor(props) {
        super(props);
        const {
          globalSearchQuery,
          alertPanelHistoryBound,
        } = props;
        this.state = {
          params: {
            globalSearchQuery,
            alertPanelHistoryBound,
          },
        };
        this.startPolling = this.startPolling.bind(this);
        this.stopPolling = this.stopPolling.bind(this);
        this.restartPolling = this.restartPolling.bind(this);
        this.registerPolling = this.registerPolling.bind(this);
        this.updatePollParams = this.updatePollParams.bind(this);
      }

      componentWillUnmount() {
        this.stopPolling();
      }

      UNSAFE_componentWillReceiveProps(newProps) {
        if (this.props.globalSearchQuery !== newProps.globalSearchQuery
          || this.props.alertPanelHistoryBound !== newProps.alertPanelHistoryBound) {
          const {
            globalSearchQuery,
            alertPanelHistoryBound,
          } = newProps;
          this.updatePollParams({
            globalSearchQuery,
            alertPanelHistoryBound,
          }, true);
        }
        if (this.props.refreshInterval !== newProps.refreshInterval) {
          this.updateRefreshInterval(newProps.refreshInterval);
        }
      }

      updateRefreshInterval(refreshInterval) {
        const intervalSecs = refreshInterval ? refreshInterval.value : 0;
        if (intervalSecs) {
          this.stopPolling();
          const timeoutId = setTimeout(() => {
            this.startPolling();
          }, intervalSecs * 1000);
          this.setState({
            timeoutId,
            retryCount: 1,
          });
        }
      }

      registerPolling(pollingFunction) {
        this.pollingFunction = pollingFunction;
      }

      updatePollParams(params, intialize = false) {
        this.setState({
          params: {
            ...(intialize ? {} : this.state.params),
            ...params
          }
        }, () => this.restartPolling());
      }

      startPolling(params = {}) {
        if (!this.pollingFunction) {
          return;
        }
        const {refreshInterval} = this.props;
        let intervalSecs = refreshInterval ? refreshInterval.value : 0;
        // override custom polling interval
        const {pollingIntervalInSecs: customInterval} = config;
        if (customInterval) {
          intervalSecs = customInterval;
        }
        const pollPromise = makeCancellable(this.pollingFunction({
          ...this.state.params,
          ...params
        }));
        this.setState({
          pollPromise,
        });
        if (intervalSecs && pollPromise.promise) {
          pollPromise.promise.then(() => {
            const timeoutId = setTimeout(() => {
              this.restartPolling({
                ...params,
                initiatedByPollable: true,
              });
            }, intervalSecs * 1000);
            this.setState({
              timeoutId,
              retryCount: 1,
            });
          }, ({isCancelled}) => {
            if (isCancelled) {
              return;
            }
            const {retryCount = 1} = this.state;
            const {setExponentialBackOff = true} = config;
            let nextInterval = intervalSecs * 1000;
            if (setExponentialBackOff) {
              nextInterval *= retryCount;
            }
            const timeoutId = setTimeout(() => {
              this.restartPolling({
                ...params,
                initiatedByPollable: true,
              });
            }, nextInterval);
            this.setState({
              timeoutId,
              retryCount: retryCount + 1,
            });
          });
        }
      }

      stopPolling() {
        const {timeoutId, pollPromise} = this.state;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (pollPromise && pollPromise.cancel) {
          pollPromise.cancel();
        }
      }

      restartPolling(params) {
        this.stopPolling();
        this.startPolling(params);
      }

      render() {
        const {...rest} = this.props;
        const pollProps = {
          registerPolling: this.registerPolling,
          startPolling: this.startPolling,
          stopPolling: this.stopPolling,
          updatePollParams: this.updatePollParams,
        };
        return (
          <WrappedComponent
            {...pollProps}
            {...rest}
          />
        );
      }
    }

    function mapStateToProps(state) {
      return {
        globalSearchQuery: state.get('globalSearchQuery'),
        alertPanelHistoryBound: state.get('alertPanelHistoryBound'),
        refreshInterval: state.get('refreshInterval'),
      };
    }

    return connect(mapStateToProps)(PollableHOC);
  }
);

export default pollable;
