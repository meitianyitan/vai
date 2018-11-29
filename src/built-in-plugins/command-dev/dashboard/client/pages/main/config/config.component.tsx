import { Connect } from 'dob-react';
import * as React from 'react';
import { PureComponent } from '../../../utils/react-helper';
import * as S from './config.style';
import { Props, State } from './config.type';

@Connect
export class ConfigComponent extends PureComponent<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  public render() {
    return <S.Container>Config TODO</S.Container>;
  }
}
