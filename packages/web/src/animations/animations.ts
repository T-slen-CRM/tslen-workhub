import {
  animate, animateChild,
  AnimationTriggerMetadata,
  group,
  keyframes,
  query, sequence,
  stagger, state,
  style,
  transition,
  trigger
} from '@angular/animations';

export const blub =
    trigger('blub', [
      transition(':leave', [
        style({ background: '#1b73e7'}),
        query('*', stagger(-50, [animateChild()]), { optional: true })
      ]),
    ]);
export const fadeOut =
    trigger('fadeOut', [
      state('void', style({ background: '#1b73e7', borderBottomColor: '#1b73e7', opacity: 0, transform: 'translateX(-550px)', 'box-shadow': 'none' })),
      transition('void => *', sequence([
        animate(".5s ease")
      ])),
      transition('* => void', [animate("3s ease")])
    ]);
export function FadeInOut(timingIn: number, timingOut: number, height = false): AnimationTriggerMetadata  {
  return trigger('fadeInOut', [
    transition(':enter', [
      style(height ? { opacity: 0 , height: 0, } : { opacity: 0, }),
      animate(timingIn, style(height ? { opacity: 1, height: 'fit-content' } : { opacity: 1, })),
    ]),
    transition(':leave', [
      animate( timingOut, style(height ? { opacity: 0, height: 0, } : { opacity: 0, })),
    ])
  ]);
}
export function FadeInOutByHidden(timingIn: number, timingOut: number, height = false): AnimationTriggerMetadata  {
  return trigger('fadeInOutByHidden', [
    state('true', style({ height: '*' })),
    state('false', style({ height: '0px' })),
    // transition('false <=> true', animate(500))
    transition('false => true', [
      style(height ? { opacity: 0 , height: 0, } : { opacity: 0, }),
      animate(timingIn, style(height ? { opacity: 1, height: 'fit-content' } : { opacity: 1, })),
    ]),
    // transition('true => false', [
    //   animate( timingOut, style(height ? { opacity: 0, height: 0, } : { opacity: 0, }))
    // ]),
    // transition(':leave', [
    //   animate( timingOut, style(height ? { opacity: 0, height: 0, } : { opacity: 0, })),
    // ])
  ]);
}

export function FadeIn(timingIn: number, height = false): AnimationTriggerMetadata  {
  return trigger('fadeIn', [
    transition(':enter', [
      style(height ? { opacity: 0 , height: 0, } : { opacity: 0, }),
      animate(timingIn, style(height ? { opacity: 1, height: 'fit-content' } : { opacity: 1, })),
    ]),
  ]);
}

export function loader() {
  return  trigger('loaderState', [
    transition('0 <=> 1', [
      group( [
        query(':nth-child(1)', [
          animate('3000ms linear', keyframes([
            style({ width: '0px', }),
            style({ width: '5px', }),
            style({ width: '10px', }),
            style({ width: '15px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '15px', }),
            style({ width: '10px', }),
            style({ width: '5px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
          ]))], { optional: true }),
        query(':nth-child(2)', [
          animate('3000ms linear', keyframes([
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '5px', }),
            style({ width: '10px', }),
            style({ width: '15px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '15px', }),
            style({ width: '10px', }),
            style({ width: '5px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
          ]))], { optional: true }),
        query(':nth-child(3)', [
          animate('3000ms linear', keyframes([
            style({ width: '20px', }),
            style({ width: '15px', }),
            style({ width: '10px', }),
            style({ width: '5px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '0px', }),
            style({ width: '5px', }),
            style({ width: '10px', }),
            style({ width: '15px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
            style({ width: '20px', }),
          ]))], { optional: true }),
      ])
    ]),
    transition('* => void', [
      sequence([
        group( [
            query('.w', [
              style({ 'padding-left': '5px', position: 'relative', }),
              animate('300ms linear', keyframes([
                style({ top: '0px', right: '-0px', width: '5px', height: '20px'}),
                style({ top: '-5px', right: '-5px', width: '10px', height: '20px'}),
                style({ top: '-15px', right: '-15px', width: '15px', height: '20px'}),
                style({ top: '-20px', right: '-25px', width: '20px', height: '20px'}),
                style({ right: '-32px', }),
              ]))
            ]),
            query(':nth-child(3)', [
              style({ width: '20px', height: '20px', display: 'flex',
                'justify-content': 'flex-start', 'align-items': 'flex-end',
                'padding-bottom': '15px', 'padding-left': '25px', position: 'relative', }),
              animate('200ms linear', keyframes([
                style({ width: '20px', height: '20px', right: '0px', }),
                style({ width: '25px', height: '25px', right: '5px', }),
                style({ width: '30px', height: '30px', right: '10px', }),
                style({ width: '35px', height: '35px', right: '15px', }),
                style({ width: '40px', height: '40px', right: '20px', }),
                style({ width: '45px', height: '45px', right: '25px', }),
                style({ width: '50px', height: '50px', right: '30px', }),
                style({ width: '55px', height: '55px', right: '35px', }),
                style({ width: '60px', height: '60px', right: '40px', }),
                style({ width: '65px', height: '65px', right: '40px', }),
                style({ width: '70px', height: '70px', right: '42.5px', }),
                style({ width: '75px', height: '75px', right: '42.5px', }),
              ]))
            ]),
            query('.q', [
              style({ width: '20px', height: '20px',
                display: 'flex', 'justify-content': 'flex-start',
                'align-items': 'flex-end', 'padding-bottom': '15px', 'padding-left': '15px',
                position: 'relative', }),
              animate('200ms linear', keyframes([
                style({ width: '20px', height: '20px', left: '5px', }),
                style({ width: '25px', height: '25px', left: '10px', }),
                style({ width: '30px', height: '30px', left: '15px', }),
                style({ width: '35px', height: '35px', left: '20px', }),
                style({ width: '40px', height: '40px', left: '25px', }),
                style({ width: '45px', height: '45px', left: '30px', }),
                style({ width: '50px', height: '50px', left: '40px', }),
                style({ width: '55px', height: '55px', left: '45px', }),
                style({ width: '60px', height: '60px', left: '50px', }),
                style({ width: '65px', height: '65px', left: '60px', }),
                style({ width: '70px', height: '70px', left: '70px', }),
              ]))
            ]),
          ]),
          group( [
            query('.w p', [
              animate('250ms linear', keyframes([
                style({ opacity: 1 }),
              ])),
            ]),
            query('.q p', [
              style({transform: 'scale(3.2)'}),
              animate('250ms linear', keyframes([
                style({ opacity: 1 }),
              ])),
            ]),
          ]),
          group( [
            query(':nth-child(3)', [
              animate('450ms linear', keyframes([
                style({ opacity: 0 }),
              ])),
            ]),
            query('.q', [
              animate('350ms linear', keyframes([
                style({ opacity: 0 }),
              ])),
            ]),
            query('.w', [
              animate('250ms linear', keyframes([
                style({ opacity: 0 }),
              ])),
            ]),
          ]),
      ])
    ])
  ]);
}

export function legendEnter() {
  return trigger('legendEnter', [
    transition('* <=> *', [
      query(':enter', [
        style({ opacity: 0 }),
        stagger(50, [
          animate('0.2s', style({ opacity: 1 }))
        ])
      ], { optional: true })
    ])
  ]);
}

export function ExpandCollapseBar(timing: number, width = 350): AnimationTriggerMetadata  {
  return trigger('expandCollapseBar', [
    state('open', style({ width: width + 'px', height: '100%', }) ),
    state('close', style({ width: '0px', height: '100%', }) ),
    transition('* <=> *', [
      animate(timing)
    ])
  ]);
}
