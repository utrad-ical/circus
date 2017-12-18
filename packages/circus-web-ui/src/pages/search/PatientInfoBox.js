import React, { Fragment } from 'react';

const PatientInfoBox = props => {
	const { patientInfo: pt } = props.value;
	if (!pt) {
		return <span className='patient-info-masked'>(masked)</span>;
	}
	return (
		<div className='patient-info-box'>
			<div>
				<span className='patient-name'>{pt.patientName}</span>&ensp;
				<span className='patient-age'>{pt.age}</span>
				<span className='patient-sex'>{pt.sex}</span>
			</div>
			<div className='sub'>
				<span className='patient-id'>{pt.patientId}</span>
				{pt.birthDate && (
					<Fragment>
						&ensp;<span className='patient-birthdate'>
							DOB: {pt.birthDate}
						</span>
					</Fragment>
				)}
				{pt.size > 0 && (
					<Fragment>
						&ensp;<span className='patient-size'>
							Ht: {pt.size}
						</span>
					</Fragment>
				)}
				{pt.weight > 0 && (
					<Fragment>
						&ensp;<span className='patient-weight'>
							Wt: {pt.weight}
						</span>
					</Fragment>
				)}
			</div>
		</div>
	);
};

export default PatientInfoBox;
