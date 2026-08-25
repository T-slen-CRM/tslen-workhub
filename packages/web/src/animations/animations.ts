import {
  animate, animateChild,
  AnimationTriggerMetadata,
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


export function ExpandCollapseBar(timing: number, width = 350): AnimationTriggerMetadata  {
  return trigger('expandCollapseBar', [
    state('open', style({ width: width + 'px', height: '100%', }) ),
    state('close', style({ width: '0px', height: '100%', }) ),
    transition('* <=> *', [
      animate(timing)
    ])
  ]);
}
