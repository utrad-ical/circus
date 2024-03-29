import React from 'react';
import { FormControl } from 'components/react-bootstrap';

const AgeMinMax: React.FC<{
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
}> = props => {
  const change = (ev: any) => {
    const newValue = {
      ...props.value,
      [ev.target.name]: parseInt(ev.target.value, 10)
    };
    props.onChange(newValue);
  };

  const min = props.value ? props.value.min : '';
  const max = props.value ? props.value.max : '';

  return (
    <span className="age-minmax form-inline">
      <FormControl type="number" value={min} name="min" onChange={change} />
      &thinsp;&mdash;&thinsp;
      <FormControl type="number" value={max} name="max" onChange={change} />
    </span>
  );
};

export default AgeMinMax;
