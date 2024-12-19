;; fee-manager.clar
(define-data-var fee-percentage uint u30) ;; 0.3%
(define-data-var fee-recipient principal 'SP...)

(define-public (set-fee
    (new-fee uint))
  (begin
    (asserts! (is-admin tx-sender) (err u1))
    (var-set fee-percentage new-fee)
    (ok true)))

(define-read-only (calculate-fee
    (amount uint))
  (/ (* amount (var-get fee-percentage)) u10000))